import signal
import subprocess

import pytest


class FakeProcess:
    def __init__(self, pid, exit_code=None, hangs=False):
        self.pid = pid
        self.exit_code = exit_code
        self.hangs = hangs

    def poll(self):
        return self.exit_code

    def wait(self, timeout=None):
        if self.hangs and timeout is not None:
            raise subprocess.TimeoutExpired("cmd", timeout)
        return 0


@pytest.fixture
def launch(dev, monkeypatch):
    launches = []
    signals = []

    def run(*outcomes, interrupt=False):
        remaining = list(outcomes)

        def popen(command, cwd, env, start_new_session):
            outcome = remaining.pop(0)
            if isinstance(outcome, Exception):
                raise outcome
            launches.append((command, cwd, env["BACKEND_URL"], start_new_session))
            return outcome

        def sleep(_seconds):
            if interrupt:
                raise KeyboardInterrupt

        monkeypatch.setattr(dev.subprocess, "Popen", popen)
        monkeypatch.setattr(dev.time, "sleep", sleep)
        monkeypatch.setattr(dev.signal, "signal", lambda *_: None)
        monkeypatch.setattr(dev.os, "killpg", lambda pid, signum: signals.append((pid, signum)))
        return dev.main()

    return run, launches, signals


def test_starts_both_against_the_configured_backend(launch, monkeypatch, dev):
    monkeypatch.setenv("OPAPRIKKIE_PORT", "9001")
    run, launches, _ = launch

    run(FakeProcess(1), FakeProcess(2, exit_code=0))

    (backend, root, url, own_group), (frontend, frontend_dir, _, _) = launches
    assert backend[-4:] == ["--host", "127.0.0.1", "--port", "9001"]
    assert (root, url, own_group) == (dev.ROOT, "http://127.0.0.1:9001", True)
    assert (frontend, frontend_dir) == (["npm", "run", "dev"], dev.ROOT / "frontend")


def test_ctrl_c_stops_both_and_exits_cleanly(launch):
    run, _, signals = launch

    assert run(FakeProcess(1), FakeProcess(2), interrupt=True) == 0
    assert (1, signal.SIGTERM) in signals
    assert (2, signal.SIGTERM) in signals


def test_one_process_dying_stops_the_other(launch):
    run, _, signals = launch

    assert run(FakeProcess(1, exit_code=3), FakeProcess(2)) == 1
    assert (2, signal.SIGTERM) in signals


def test_launch_failure_stops_what_already_started(launch):
    run, _, signals = launch

    with pytest.raises(FileNotFoundError):
        run(FakeProcess(1), FileNotFoundError("npm"))
    assert (1, signal.SIGTERM) in signals


def test_stop_escalates_to_sigkill_after_the_grace_period(launch):
    run, _, signals = launch

    run(FakeProcess(1, hangs=True), FakeProcess(2, exit_code=0))

    assert signals.index((1, signal.SIGTERM)) < signals.index((1, signal.SIGKILL))


def test_signalling_an_exited_group_is_ignored(dev, monkeypatch):
    def killpg(_pid, _signum):
        raise ProcessLookupError

    monkeypatch.setattr(dev.os, "killpg", killpg)

    dev.signal_group(FakeProcess(1), signal.SIGTERM)
