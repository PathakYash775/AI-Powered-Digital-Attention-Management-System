"""
Generates multi-resolution AttentionTracker app.ico (16, 32, 48, 64, 128, 256px).
Creates a modern, vibrant attention/focus target icon.
"""

import sys
from pathlib import Path

def create_icon(output_path: Path) -> bool:
    try:
        from PIL import Image, ImageDraw
    except ImportError:
        print("Pillow not installed. Attempting to install Pillow or generate fallback...")
        return False

    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Base high-res 256x256 master image
    size = 256
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # 1. Dark rounded background
    margin = 8
    draw.rounded_rectangle(
        [margin, margin, size - margin, size - margin],
        radius=52,
        fill=(15, 23, 42, 255),       # Slate 900
        outline=(59, 130, 246, 255),  # Blue 500
        width=6
    )

    # 2. Outer pulse ring (indigo/violet glow)
    draw.ellipse(
        [44, 44, size - 44, size - 44],
        outline=(99, 102, 241, 180),  # Indigo 500
        width=8
    )

    # 3. Inner focus ring (cyan/sky glow)
    draw.ellipse(
        [74, 74, size - 74, size - 74],
        outline=(56, 189, 248, 220),  # Sky 400
        width=10
    )

    # 4. Bullseye center target
    draw.ellipse(
        [106, 106, size - 106, size - 106],
        fill=(59, 130, 246, 255),     # Blue 500
        outline=(255, 255, 255, 255), # White accent
        width=4
    )

    # 5. Core bright center dot
    draw.ellipse(
        [120, 120, size - 120, size - 120],
        fill=(255, 255, 255, 255)     # Pure White
    )

    # Save as multi-size ICO
    sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    img.save(str(output_path), format="ICO", sizes=sizes)
    print(f"Successfully generated multi-size app.ico at: {output_path}")
    return True

if __name__ == "__main__":
    out = Path(__file__).parent / "app.ico"
    if not create_icon(out):
        sys.exit(1)
