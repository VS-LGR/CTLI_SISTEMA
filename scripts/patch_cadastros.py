from pathlib import Path

p = Path(__file__).resolve().parent.parent / "src/pages/CadastrosPage.jsx"
t = p.read_text(encoding="utf-8")
start = t.index('  return (\n    <motion className="space-y-6"')
if start < 0:
    start = t.index('  return (\n    <div className="space-y-6"')
end = t.index("\n};\n\nfunction SupplierSection")
# read file and fix motion tags if partial patch
t2 = t[:start] + open(__file__).read().split('new_block = """')[1].split('"""')[0] if False else ""
# simpler: just fix motion in file
t = p.read_text(encoding='utf-8')
t = t.replace('<motion', '<div').replace('</motion>', '</motion>')
t = t.replace('</motion>', '</motion>')  # noop
import re
# fix any remaining motion
while '<motion' in t or '</motion>' in t:
    t = t.replace('<motion', '<div').replace('</motion>', '</motion>')
t = t.replace('</motion>', '</div>')
# remove Tabs if still present - check
if '<Tabs defaultValue' in t:
    start = t.index('  return (\n    <div className="space-y-6"')
    end = t.index("\n};\n\nfunction SupplierSection")
    new_block = Path(__file__).read_text(encoding='utf-8').split('NEWBLOCK_START')[1].split('NEWBLOCK_END')[0]
    t = t[:start] + new_block + t[end:]
p.write_text(t, encoding='utf-8')
print('done', '<Tabs' in t)
