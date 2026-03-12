import re

path = r'c:\inbound_byevan\frontend\src\pages\dashboard\DashboardInboundTab.tsx'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Map of corrupted -> correct strings
fixes = [
    # Arrows in card headers
    ("Avg Receive \u00e2\u0086\u2019 Putaway", "Avg Receive \u2192 Putaway"),
    ("Avg Kedatangan \u00e2\u0086\u2019 Putaway", "Avg Kedatangan \u2192 Putaway"),
    # Pending Inbound  ⏳
    ("\u00e2\u00b3 Pending Inbound", "\u23f3 Pending Inbound"),
    # Tick + em-dash
    ("\u00e2\u009c\u2026 Tidak ada pending \u00e2\u0080\u0153 semua", "\u2705 Tidak ada pending \u2014 semua"),
    # 3 chart labels — em-dash
    ("\u00f0\u0178\u00b7\u00ef\u00b8\u008f Barang Jual \u00e2\u0080\u0153 Plan Qty vs PO Qty per Brand", "\U0001f3f7\ufe0f Barang Jual \u2014 Plan Qty vs PO Qty per Brand"),
    ("\u00f0\u0178\u008e Gimmick \u00e2\u0080\u0153 Plan Qty vs PO Qty per Brand", "\U0001f381 Gimmick \u2014 Plan Qty vs PO Qty per Brand"),
    ("\u00f0\u0178\u201c\u017d ATK \u00e2\u0080\u0153 Plan Qty vs PO Qty per Brand", "\U0001f4ce ATK \u2014 Plan Qty vs PO Qty per Brand"),
    # Card titles
    ("\u00f0\u0178\u201c\u02c6 Breakdown Qty", "\U0001f4c8 Breakdown Qty"),
    ("\u00f0\u0178\u201c\u0160 PO", "\U0001f4ca PO"),
    ("\u00f0\u0178\u00b7\u00ef\u00b8\u008f VAS Type", "\U0001f3f7\ufe0f VAS Type"),
    ("\u00f0\u0178\u201c\u00a6 Value-Added Services", "\U0001f4e6 Value-Added Services"),
    ("\u00f0\u0178\u0161\u0161 Unloading Summary", "\U0001f69a Unloading Summary"),
]

for bad, good in fixes:
    content = content.replace(bad, good)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done. Checking remaining corrupted chars:")
import re
problems = re.findall(r'[\xc0-\xff]{2,}', content)
if problems:
    for p in problems[:10]:
        print(repr(p))
else:
    print("No corrupted sequences found!")
