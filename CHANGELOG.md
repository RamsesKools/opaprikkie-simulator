# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 0.1.0 (2025-08-05)

### Added

- Initial project setup with Python template
  - Ruff for linting and code formatting
  - Pre-commit hooks for code quality
  - Poetry for dependency management
  - GitHub Actions workflows for CI/CD

- Complete Opa Prikkie game simulator
  - **Strategies**: Three AI strategies implemented
    - `RandomStrategy`: Chooses targets randomly from available options
    - `GreedyStrategy`: Always chooses the target that moves a peg the furthest
    - `SmartStrategy`: Considers multiple factors including completion bonuses
  - **Manual Play**: Interactive mode for playing games manually with user input
  - **CLI Interface**: Command-line interface with two modes
    - Interactive mode: `python -m opaprikkie_sim.cli`
    - Simulation mode: `python -m opaprikkie_sim.cli --mode simulation --games 1000 --strategy1 greedy --strategy2 smart`
