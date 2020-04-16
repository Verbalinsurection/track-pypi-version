const core = require('@actions/core')
const github = require('@actions/github')
var fs = require('fs')
var request = require('request')
const exec = require('actions-exec-listener')

function parseReqFile (reqFilePath, packagesList) {
  var packagesListRaw = fs.readFileSync(reqFilePath).toString().split('\n')

  var packageEntry
  for (packageEntry in packagesListRaw) {
    var packageName
    var packageVersion
    if (packagesListRaw[packageEntry].includes('==')) {
      var packageEntrySplit = packagesListRaw[packageEntry].split('==')
      packageName = packageEntrySplit[0].trim()
      packageVersion = packageEntrySplit[1].trim()
    } else {
      packageName = packagesListRaw[packageEntry]
      packageVersion = null
    }

    packagesList[packageName] = {}
    packagesList[packageName].version = packageVersion
  }
}

async function downloadFile (url, fileName) {
  const file = fs.createWriteStream(fileName)
  await new Promise((resolve, reject) => {
    request({
      uri: url
    })
      .pipe(file)
      .on('finish', () => {
        resolve()
      })
      .on('error', (error) => {
        reject(error)
      })
  })
    .catch(error => {
      console.log(`Something happened: ${error}`)
    })
}

function parsePyPIVersion (fileName, setVersion) {
  try {
    var data = fs.readFileSync(fileName, 'utf8')

    const XmlReader = require('xml-reader')
    const ast = XmlReader.parseSync(data)
    const XmlQuery = require('xml-query')

    setVersion.Value = XmlQuery(ast).children().find('entry').find('title').first().text()
  } catch (e) {
    console.log('No DOM: ' + e)
    return false
  }

  return true
}

function writeNewReqFile (reqFilePath, packagesList) {
  var reqStream = fs.createWriteStream(reqFilePath, {
    flags: 'w'
  })
    .on('error', (error) => {
      throw (error)
    })

  var packageUnit
  for (packageUnit in packagesList) {
    reqStream.write(`${packageUnit}==${packagesList[packageUnit].pypiVersion}\n`)
  }
}

const push = async (reqFilePath) => {
  core.startGroup('git config')
  await exec.exec('git config --global user.name github-actions')
  await exec.exec('git config --global user.email actions@github.com')
  core.endGroup()

  core.startGroup('git')
  await exec.exec(`git add ${reqFilePath}`)
  await exec.exec('git commit -m "[auto] Required Python package update"')
  await exec.exec('git push -f -u origin')
  core.endGroup()
}

async function app () {
  try {
    console.log(`Repo: ${github.context.repo.owner}/${github.context.repo.repo}`)

    const reqFilePath = core.getInput('reqfile')
    console.log(`Requirements file: ${reqFilePath}`)

    var needBackup = false
    if (core.getInput('backup') === 'true') needBackup = true
    console.log(`Make requirements.txt backup: ${needBackup}`)

    var packagesList = {}
    parseReqFile(reqFilePath, packagesList)

    console.log(`${Object.keys(packagesList).length} python packages`)
    var packageUnit
    for (packageUnit in packagesList) {
      console.log(` * ${packageUnit}: ${packagesList[packageUnit].version}`)
    }

    var updateAvailable = false
    console.log('Check for update')
    for (packageUnit in packagesList) {
      await downloadFile(`https://libraries.io/pypi/${packageUnit}/versions.atom`, packageUnit)

      var pypiVersion = { Value: 0 }
      if (parsePyPIVersion(packageUnit, pypiVersion)) {
        packagesList[packageUnit].pypiVersion = pypiVersion.Value
        if (packagesList[packageUnit].version !== pypiVersion.Value) {
          packagesList[packageUnit].updateAvailable = true
          updateAvailable = true
        } else {
          packagesList[packageUnit].updateAvailable = false
        }
      } else {
        packagesList[packageUnit].pypiVersion = null
        packagesList[packageUnit].updateAvailable = false
      }

      console.log(` * Package ${packageUnit} (${packagesList[packageUnit].version} -> ${packagesList[packageUnit].pypiVersion})`)
      console.log(`   Update: ${packagesList[packageUnit].updateAvailable}`)
    }

    if (updateAvailable) {
      if (needBackup) {
        console.log('Backup requirements file')
        fs.renameSync(reqFilePath, `${reqFilePath}.old`)
      }

      console.log('Update requirements file')
      writeNewReqFile(reqFilePath, packagesList)

      core.setOutput('commit', 'true')

      console.log('Commit and push')
      await push(reqFilePath)
    }
  } catch (error) {
    core.setFailed(error.message)
  }
}

app()
