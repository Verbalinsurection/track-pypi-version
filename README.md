# Track PyPI version javascript action

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
