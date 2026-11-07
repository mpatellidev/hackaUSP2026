import os
import tempfile
from pathlib import Path

_tmp = Path(tempfile.mkdtemp())
os.environ["DATABASE_URL"] = f"sqlite:///{(_tmp / 'test.db').as_posix()}"
os.environ["TTS_CACHE_DIR"] = str(_tmp / "tts")
os.environ["AUTH_PROVIDER"] = "local"
os.environ["SCHEDULING_PROVIDER"] = "mock"
os.environ["TTS_PROVIDER"] = "none"
os.environ["ANTHROPIC_API_KEY"] = "test"
