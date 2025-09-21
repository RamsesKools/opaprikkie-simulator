# Define the modules as a global variable
$global:modules = "src/opaprikkie_sim tests"

function RunClean {
    Remove-Item -Path ".coverage" -Force -Recurse -ErrorAction SilentlyContinue
    Remove-Item -Path ".hypothesis" -Force -Recurse -ErrorAction SilentlyContinue
    Remove-Item -Path ".mypy_cache" -Force -Recurse -ErrorAction SilentlyContinue
    Remove-Item -Path ".pytest_cache" -Force -Recurse -ErrorAction SilentlyContinue
    Remove-Item -Path "*.egg-info" -Force -Recurse -ErrorAction SilentlyContinue
    Remove-Item -Path "dist" -Force -Recurse -ErrorAction SilentlyContinue
    Get-ChildItem -Path . | Where-Object { $_.Name -match "__pycache__|docs_.*|\.pyc|\.pyo" } | ForEach-Object { Remove-Item $_.FullName -Force -Recurse }
}

function RunFormat {
    & poetry run ruff format $global:modules
}

function RunCheckRuff {
    & poetry run ruff check $global:modules
}

function RunCheckMypy {
    & poetry run mypy $global:modules --pretty --install-types --non-interactive
}

function RunCheck {
    RunCheckMypy
    RunCheckRuff
}

function RunPytest {
    & poetry run pytest --cov=opaprikkie_sim --cov-branch --junitxml=python_test_report.xml
}

function RunAllCheckTest {
    RunCheck
    RunPytest
}

function ShowHelp {
    Write-Output "usage: .\make.ps1 [target]"
    Write-Output ""
    Write-Output "clean:"
    Write-Output "  clean                          remove all generated temp files"
    Write-Output ""
    Write-Output "format:"
    Write-Output "  format                         format code by ruff"
    Write-Output ""
    Write-Output "check:"
    Write-Output "  check_ruff                     check code linting and formatting with ruff"
    Write-Output "  check_mypy                     check typing with mypy"
    Write-Output "  check                          check ruff and mypy"
    Write-Output ""
    Write-Output "tests:"
    Write-Output "  pytest                         run tests with pytest"
    Write-Output "  all_check_test                 run all checks and tests"
    Write-Output ""
    Write-Output "other:"
    Write-Output "  help                           show this help"
    Write-Output ""
}

# Check the command-line arguments and execute the corresponding command
switch ($args[0]) {
    "clean" { RunClean }
    "format" { RunFormat }
    "check_ruff" { RunCheckRuff }
    "check_mypy" { RunCheckMypy }
    "check" { RunCheck }
    "pytest" { RunPytest }
    "all_check_test" { RunAllCheckTest }
    "help" { ShowHelp }
    default { ShowHelp }
}
