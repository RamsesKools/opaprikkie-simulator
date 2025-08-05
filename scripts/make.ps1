# Define the modules as a global variable
$global:modules = "src/ff tests"

function RunClean {
    Remove-Item -Path ".coverage" -Force -Recurse -ErrorAction SilentlyContinue
    Remove-Item -Path ".hypothesis" -Force -Recurse -ErrorAction SilentlyContinue
    Remove-Item -Path ".mypy_cache" -Force -Recurse -ErrorAction SilentlyContinue
    Remove-Item -Path ".pytest_cache" -Force -Recurse -ErrorAction SilentlyContinue
    Remove-Item -Path "*.egg-info" -Force -Recurse -ErrorAction SilentlyContinue
    Remove-Item -Path "dist" -Force -Recurse -ErrorAction SilentlyContinue
    Get-ChildItem -Path . | Where-Object { $_.Name -match "__pycache__|docs_.*|\.pyc|\.pyo" } | ForEach-Object { Remove-Item $_.FullName -Force -Recurse }
    Write-Output "Clean command executed successfully."
}

function RunFormat {
    & poetry run ruff format $global:modules
    Write-Output "Format command executed successfully for modules: $global:modules"
}

function RunCheckRuff {
    & poetry run ruff check $global:modules
    Write-Output "Ruff check command executed successfully for modules: $global:modules"
}

function RunCheckMypy {
    & poetry run mypy --pretty $global:modules --install-types --non-interactive
    Write-Output "Mypy type-check command executed successfully for modules: $global:modules"
}

function RunCheck {
    RunCheckRuff
    RunCheckMypy
    Write-Output "Check command executed successfully (ruff + mypy)."
}

function RunPytest {
    & poetry run pytest --cov=opaprikkie-sim --junitxml=python_test_report.xml --basetemp=.\tests\.tmp
    Write-Output "Pytest command executed successfully."
}

function RunCheckTest {
    RunCheck
    RunPytest
    Write-Output "Check + Test command executed successfully."
}

# Check the command-line arguments and execute the corresponding command
switch ($args[0]) {
    "clean" { RunClean }
    "format" { RunFormat }
    "check_ruff" { RunCheckRuff }
    "check_mypy" { RunCheckMypy }
    "check" { RunCheck }
    "pytest" { RunPytest }
    "check-test" { RunCheckTest }
    default { Write-Output "Invalid argument. Please specify a valid command: clean, format, check_ruff, check_mypy, check, pytest, check-test, or documentation." }
}
