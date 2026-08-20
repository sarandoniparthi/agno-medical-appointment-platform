def test_shared_package_exposes_version() -> None:
    from agno_platform import __version__

    assert __version__ == "0.1.0"
