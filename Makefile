modules := src/opaprikkie_sim tests
.PHONY: clean format check_ruff check_mypy check pytest all_check_test help

DEFAULT_GOAL: help

clean: ##@clean >> remove all generated temp files
	rm -rf .coverage .hypothesis .mypy_cache .pytest_cache *.egg-info
	rm -rf dist
	find . | grep -E "(__pycache__|docs_.*$$|\.pyc|\.pyo$$)" | xargs rm -rf

format: ##@format >> format code by ruff
	poetry run ruff format $(modules)

check_ruff: ##@check >> check code linting and formatting with ruff
	poetry run ruff check $(modules)

check_mypy: ##@check >> check typing with mypy
	poetry run mypy $(modules) --pretty --install-types --non-interactive

check: ##@check >> check ruff and mypy
	$(MAKE) check_mypy
	$(MAKE) check_ruff

pytest: ##@tests >> run tests with pytest
	poetry run pytest --cov=opaprikkie-sim --junitxml=python_test_report.xml --basetemp=./tests/.tmp

all_check_test: ##@tests >> run all checks and tests
	$(MAKE) check
	$(MAKE) pytest

# Add help text after each target name starting with `##`
# A category can be added with @category
HELP_FUN = \
	%help; \
	while(<>) { push @{$$help{$$2 // 'options'}}, [$$1, $$3] if /^([a-zA-Z\_\-\$\(]+)\s*:.*\#\#(?:@([a-zA-Z\-\)]+))?\s(.*)$$/ }; \
	print "usage: make [target]\n\n"; \
	for (sort keys %help) { \
	print "${WHITE}$$_:${RESET}\n"; \
	for (@{$$help{$$_}}) { \
	$$sep = " " x (32 - length $$_->[0]); \
	print "  ${YELLOW}$$_->[0]${RESET}$$sep${GREEN}$$_->[1]${RESET}\n"; \
	}; \
	print "\n"; }

help: ##@other >> show this help
	@perl -e '$(HELP_FUN)' $(MAKEFILE_LIST)
