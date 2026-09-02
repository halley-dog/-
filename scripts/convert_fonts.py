from pathlib import Path

from fontTools.ttLib import TTFont


ROOT = Path(__file__).resolve().parents[1]
FONTS = ROOT / "assets" / "fonts"
OUTPUT = FONTS / "converted"

PAIRS = [
    (FONTS / "latin" / "NotoSerifSC-Regular.ttf", "noto-serif-sc-regular.woff2"),
    (FONTS / "zh" / "NotoSerifSC-Bold.ttf", "noto-serif-sc-bold.woff2"),
    (FONTS / "latin" / "Roboto_SemiCondensed-Bold.ttf", "roboto-semicondensed-bold.woff2"),
    (FONTS / "latin" / "SourceSans3-Regular.ttf", "source-sans-3.woff2"),
    (FONTS / "latin" / "SourceSerif4-Regular.ttf", "source-serif-4.woff2"),
    (FONTS / "zh" / "QiuYeYuanTi-16.ttf", "qiuye-yuanti.woff2"),
    (FONTS / "zh" / "乐米元气团团体.ttf", "lemi-yuanqi.woff2"),
    (FONTS / "zh" / "朝华标题A1.001.ttf", "chaohua-title.woff2"),
]


OUTPUT.mkdir(exist_ok=True)
for source, output_name in PAIRS:
    output = OUTPUT / output_name
    if output.exists():
        print(f"{output.name}: {output.stat().st_size} bytes (existing)")
        continue
    font = TTFont(source)
    font.flavor = "woff2"
    font.save(output)
    print(f"{output.name}: {output.stat().st_size} bytes")
