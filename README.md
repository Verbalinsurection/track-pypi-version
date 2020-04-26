# Track PyPI version javascript action

[![GitHub Release Version](https://img.shields.io/github/v/release/Verbalinsurection/track-pypi-version.svg?include_prereleases)](https://github.com/Verbalinsurection/track-pypi-version/releases)
![GitHub Release Date](https://img.shields.io/github/release-date/Verbalinsurection/track-pypi-version)
[![GitHub](https://img.shields.io/github/license/Verbalinsurection/track-pypi-version)](LICENSE)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/4c588c4c7fd143169684bd8643d975f3)](https://www.codacy.com/manual/t.stassinopoulos/track-pypi-version?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=Verbalinsurection/track-pypi-version&amp;utm_campaign=Badge_Grade)
![Push pre-built action](https://github.com/Verbalinsurection/track-pypi-version/workflows/Push%20pre-built%20action/badge.svg)

Track Python package from requirements.txt, check if newer version exist in PyPI and provide update info.
Can be useful to notify or to trigger an up to date docker image build.

## Use

You can use built version on release-master branch

## Inputs

### `reqfile`

**Optionnal** Path to `requirements.txt` file. Default to `/requirements.txt`

### `backup`

**Optionnal** Make a backup of requirements.txt if set to `true`. Default to `false`

## Outputs

### `commit`

If true, need to commit the new requirements.txt file
