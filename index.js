const core = require('@actions/core')
const github = require('@actions/github')
const fs = require('fs')
const fetch = require('node-fetch')
const xml2js = require('xml2js')
const exec = require('actions-exec-listener')

function parseReqFile (reqFilePath, packagesList) {
  const packagesListRaw = fs.readFileSync(reqFilePath).toString().split('\n')

  let packageEntry
  for (packageEntry in packagesListRaw) {
    if (packagesListRaw[packageEntry].trim()) {
      let packageName
      let packageVersion
      if (packagesListRaw[packageEntry].includes('==')) {
        const packageEntrySplit = packagesListRaw[packageEntry].split('==')
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
}

async function getPyPiVersion (packageId) {
  const packageUrl = `https://libraries.io/pypi/${packageId}/versions.atom`
  const response = await fetch(packageUrl)

  if (response.ok) {
    const body = await response.text()
    const parser = new xml2js.Parser()
    let extractData
    parser.parseString(body, function (err, result) {
      if (!err && Object.keys(result)) {
        extractData = result.feed.entry[0].title.toString()
      }
    })
    return extractData
  } else {
    return null
  }
}

function writeNewReqFile (reqFilePath, packagesList) {
  const reqStream = fs.createWriteStream(reqFilePath, {
    flags: 'w'
  })
    .on('error', (error) => {
      throw (error)
    })

  let packageUnit
  for (packageUnit in packagesList) {
    reqStream.write(`${packageUnit}==${packagesList[packageUnit].pypiVersion}\n`)
  }
}

const push = async (reqFilePath, needBackup) => {
  core.startGroup('git config')
  await exec.exec('git config --global user.name github-actions')
  await exec.exec('git config --global user.email actions@github.com')
  core.endGroup()

  core.startGroup('git')
  await exec.exec(`git add ${reqFilePath}`)
  if (needBackup) await exec.exec(`git add ${reqFilePath}.old`)
  await exec.exec('git commit -m "[auto] Required Python package update"')
  await exec.exec('git push -f -u origin')
  core.endGroup()
}

async function app () {
  try {
    const pjson = require('./package.json')
    console.log(`🚀 ${pjson.name} - Version: ${pjson.version} 🚀`)
    console.log(` ➡️ Repo: ${github.context.repo.owner}/${github.context.repo.repo}`)

    let comPush = false
    if (core.getInput('compush') === 'true') comPush = true
    console.log(` ➡️ Commit and push: ${comPush}`)

    const reqFilePath = core.getInput('reqfile') || './requirements.txt'
    console.log(` ➡️ Requirements file: ${reqFilePath}`)

    let needBackup = false
    if (core.getInput('backup') === 'true') needBackup = true
    console.log(` ➡️ Make requirements.txt backup: ${needBackup}`)

    const packagesList = {}
    parseReqFile(reqFilePath, packagesList)

    console.log(`🐍 ${Object.keys(packagesList).length} python packages found:`)
    let packageUnit
    for (packageUnit in packagesList) {
      console.log(` ➡️ ${packageUnit}: ${packagesList[packageUnit].version}`)
    }

    console.log('🛠️ Check for update')
    let updateAvailable = false
    for (packageUnit in packagesList) {
      const versionPypi = await getPyPiVersion(packageUnit)

      if (versionPypi) {
        packagesList[packageUnit].pypiVersion = versionPypi
        if (packagesList[packageUnit].version !== packagesList[packageUnit].pypiVersion) {
          packagesList[packageUnit].updateAvailable = true
          updateAvailable = true
        } else {
          packagesList[packageUnit].updateAvailable = false
        }
      } else {
        packagesList[packageUnit].pypiVersion = packagesList[packageUnit].version
        packagesList[packageUnit].updateAvailable = false
      }

      const upTag = (packagesList[packageUnit].updateAvailable) ? '⚠️' : '✅'
      console.log(` ${upTag} Package ${packageUnit} (${packagesList[packageUnit].version} -> ${packagesList[packageUnit].pypiVersion})`)
    }

    if (updateAvailable) {
      if (needBackup) {
        console.log('🛠️ Backup requirements file')
        fs.renameSync(reqFilePath, `${reqFilePath}.old`)
      }

      console.log('🛠️ Update requirements file')
      writeNewReqFile(reqFilePath, packagesList)

      if (comPush) {
        console.log('🐱 Commit and push')
        await push(reqFilePath, needBackup)
      }
    }
    core.setOutput('commit', updateAvailable)
  } catch (error) {
    core.setFailed(error.message)
  }
}

app()
