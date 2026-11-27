# 维修价目：把公司的「维修收费价目总表」Excel 转成网页用的 JSON（之后由我们上传到云端 cs_docs.repair_prices，audience = cs）。
# 这个档案只有转换的程序，不放任何价钱；价钱只在云端，GitHub 上看不到。
# 用法：python3 repair/import.py 价目表.xlsx 输出.json
import base64, gzip, io, json, re, sys
import openpyxl
from PIL import Image


def txt(v):
    if v is None:
        return ''
    if isinstance(v, float) and v.is_integer():
        v = int(v)
    return re.sub(r'\s+', ' ', str(v)).strip()


def price(v):
    s = txt(v)
    if s in ('', '-', '—'):
        return None
    return int(s) if re.fullmatch(r'\d+', s) else s   # 纯数字存成数字；「免费」「时价」「100（新价钱：90）」这种照原文


def name(s):
    return re.sub(r'\s+', '', txt(s))   # 「天祥手表 （男）」→「天祥手表（男）」


def cat_of(n):
    for key, cat in (('手表', 'watch'), ('戒指', 'ring'), ('手链', 'bracelet'), ('吊坠', 'pendant'), ('牌', 'plaque'), ('耳环', 'earring')):
        if key in n:
            return cat
    return 'other'


def matrix(ws, head_row, first_row, name_cols, part_col=2, q_col=3):
    """手表、戒指：一列一个产品，左边「部件」（合并格）+「返修问题」。回传 {产品: [(部件, 问题, 价钱, 备注)]}"""
    out, part, last = {n: [] for n in name_cols.values()}, '', None
    for r in range(first_row, ws.max_row + 1):
        part = txt(ws.cell(r, part_col).value) or part
        q = txt(ws.cell(r, q_col).value)
        prices = {n: price(ws.cell(r, c).value) for c, n in name_cols.items()}
        if q.startswith('备注') or (q and not any(p is not None for p in prices.values()) and last and ws.cell(r, q_col).value.startswith(' ')):
            for n in out:   # 「备注：…」接在上一个项目后面（每个产品都有）
                if out[n] and out[n][-1][1] == last:
                    out[n][-1][3] = (out[n][-1][3] + '\n' if out[n][-1][3] else '') + q
            continue
        q = q or part   # 例如「证书」只写在部件栏
        if not q:
            continue
        for n, p in prices.items():
            if p is not None:
                out[n].append([part, q, p, ''])
        last = q
    return out


def cols(ws, row, start):
    out = {c: name(ws.cell(row, c).value) for c in range(start, ws.max_column + 1) if txt(ws.cell(row, c).value) and txt(ws.cell(row, c).value) not in ('中国',)}
    dup = [n for n in set(out.values()) if list(out.values()).count(n) > 1]
    if dup:   # 同名的两栏会互相盖掉价钱：宁可停下来让人看
        sys.exit('「' + ws.title + '」有同名的产品栏：' + '、'.join(dup) + '，请先改表头再转')
    return out


def img_url(im):
    pic = Image.open(io.BytesIO(im._data())).convert('RGB')
    pic.thumbnail((360, 360))
    buf = io.BytesIO()
    pic.save(buf, "WEBP", quality=50)
    return 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode()


def main(src, dst):
    wb = openpyxl.load_workbook(src, data_only=True)   # 价钱格是公式的话读算好的数字
    products, skipped = {}, []

    def add(n, rows, cat=None):   # cat：手表、戒指表照工作表分类；其他照产品名猜
        p = products.setdefault(n, {'name': n, 'cat': cat or cat_of(n), 'groups': [], 'images': []})
        for part, q, pr, note in rows:
            if any(it['q'] == q for g in p['groups'] if g['part'] == part for it in g['items']):
                skipped.append(n + ' / ' + (part + ' / ' if part else '') + q + '：两张表都有，用第一张的')
                continue
            if not p['groups'] or p['groups'][-1]['part'] != part:
                p['groups'].append({'part': part, 'items': []})
            p['groups'][-1]['items'].append({'q': q, 'price': pr, 'note': note})

    ws = wb['手表']
    for n, rows in matrix(ws, 1, 3, cols(ws, 1, 5)).items():
        add(n, rows, 'watch')
    for sheet in ('戒指', '戒指2'):   # 两张戒指表，同一个戒指合在一起
        ws = wb[sheet]
        for n, rows in matrix(ws, 4, 7, cols(ws, 4, 4)).items():
            add(n, rows, 'ring')

    ws = wb['手链、吊坠、寻龙撅，牌子，耳环']
    ranges, cur = [], None
    for r in range(3, ws.max_row + 1):
        n = name(ws.cell(r, 1).value)
        if n:
            cur = n
            ranges.append([n, r, r])
        if not cur:
            continue
        ranges[-1][2] = r
        q, pr, note = txt(ws.cell(r, 2).value), price(ws.cell(r, 3).value), txt(ws.cell(r, 4).value)
        if q and pr is not None:
            add(cur, [['', q, pr, note]])
        elif q:
            skipped.append(cur + ' / ' + q + '：没有价钱，没放进去（第 ' + str(r) + ' 行）')
    for im in ws._images:   # 图片放在它所在那几列的产品
        row = im.anchor._from.row + 1
        for n, a, b in ranges:
            if a <= row <= b and n in products:
                products[n]['images'].append(img_url(im))
                break
        else:
            skipped.append('第 ' + str(row) + ' 行的图片：对不到产品，没放进去')

    order = ['watch', 'ring', 'bracelet', 'pendant', 'plaque', 'earring', 'other']
    data = {
        'title': '维修收费价目总表',
        'version': re.search(r'\d{4}-\d{2}-\d{2}', src).group(0) if re.search(r'\d{4}-\d{2}-\d{2}', src) else '',
        'currency': 'RMB',
        'cats': [{'id': 'watch', 'name': '手表'}, {'id': 'ring', 'name': '戒指'}, {'id': 'bracelet', 'name': '手链'}, {'id': 'pendant', 'name': '吊坠'},
                 {'id': 'plaque', 'name': '牌子'}, {'id': 'earring', 'name': '耳环'}, {'id': 'other', 'name': '其他'}],
        'products': sorted(products.values(), key=lambda p: order.index(p['cat'])),
    }
    # 上传格式跟海外手册一样：{v, gz}，gz = gzip 后的 base64（网页用浏览器内建的解压）
    raw = json.dumps(data, ensure_ascii=False).encode()
    for p in data['products']:
        print('%-8s %-14s %3d 项  %d 张图' % (p['cat'], p['name'], sum(len(g['items']) for g in p['groups']), len(p['images'])))
    for x in skipped:
        print('跳过：' + x)
    print('共 %d 个产品；有 %d 行跳过，请对一下有没有漏' % (len(data['products']), len(skipped)))
    with open(dst, 'w', encoding='utf-8') as f:
        json.dump({'v': data['version'], 'gz': base64.b64encode(gzip.compress(raw, 9)).decode()}, f)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
