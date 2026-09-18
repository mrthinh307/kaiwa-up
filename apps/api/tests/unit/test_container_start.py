"""Exercise the Linux container supervisor with real child processes, without a database."""

import os
import shutil
import signal
import subprocess
import time
from contextlib import suppress
from pathlib import Path

import pytest

pytestmark = pytest.mark.skipif(os.name != "posix", reason="Linux container entrypoint")
START_SCRIPT = Path(__file__).resolve().parents[2] / "scripts" / "start.sh"


@pytest.mark.parametrize("exiting_child", ["python", "uvicorn", None])
def test_children_stop_together(tmp_path: Path, exiting_child: str | None) -> None:
    bash = shutil.which("bash")
    assert bash is not None
    binaries = tmp_path / ".venv" / "bin"
    binaries.mkdir(parents=True)
    for name in ("python", "uvicorn"):
        executable = binaries / name
        executable.write_text(
            "#!/bin/bash\n"
            f"trap 'touch {name}.stopped; exit 0' TERM INT\n"
            f"touch {name}.started\n"
            "while [[ ! -f release ]]; do sleep 0.05; done\n"
            + ("exit 7\n" if name == exiting_child else "while true; do sleep 0.05; done\n")
        )
        executable.chmod(0o755)

    process = subprocess.Popen([bash, str(START_SCRIPT)], cwd=tmp_path, start_new_session=True)
    try:
        deadline = time.monotonic() + 5
        while not all((tmp_path / f"{name}.started").exists() for name in ("python", "uvicorn")):
            assert process.poll() is None, "Supervisor exited before starting both children"
            assert time.monotonic() < deadline, "Children did not start"
            time.sleep(0.05)
        (tmp_path / "release").touch()
        if exiting_child is None:
            process.terminate()
        assert process.wait(timeout=5) == (0 if exiting_child is None else 7)
        for name in ("python", "uvicorn"):
            if name != exiting_child:
                assert (tmp_path / f"{name}.stopped").exists()
    finally:
        # Also clean descendants if a broken supervisor exits early or fails an assertion.
        with suppress(ProcessLookupError):
            os.killpg(process.pid, signal.SIGKILL)
        process.wait(timeout=5)
