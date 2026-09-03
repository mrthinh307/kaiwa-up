from io import BytesIO

import pytest
from PIL import Image

from app.exceptions import AvatarInvalidError, AvatarUnsupportedTypeError
from app.services.user import UserService


def image_bytes(*, size: tuple[int, int] = (512, 512), image_format: str = "PNG") -> bytes:
    image = Image.new("RGBA", size, (35, 120, 220, 180))
    output = BytesIO()
    image.save(output, format=image_format)
    return output.getvalue()


def test_normalize_avatar_outputs_webp_without_metadata() -> None:
    normalized = UserService._normalize_avatar(image_bytes())

    with Image.open(BytesIO(normalized)) as image:
        assert image.format == "WEBP"
        assert image.size == (512, 512)
        assert "exif" not in image.info
        assert "xmp" not in image.info


@pytest.mark.parametrize(
    "content",
    [image_bytes(size=(256, 512)), image_bytes(image_format="GIF")],
)
def test_normalize_avatar_rejects_invalid_or_unsupported_images(content: bytes) -> None:
    with pytest.raises((AvatarInvalidError, AvatarUnsupportedTypeError)):
        UserService._normalize_avatar(content)


def test_normalize_avatar_rejects_non_image_bytes() -> None:
    with pytest.raises(AvatarInvalidError):
        UserService._normalize_avatar(b"not an image")
