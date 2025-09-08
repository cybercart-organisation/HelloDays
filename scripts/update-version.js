const fs = require('fs');
const path = require('path');

// File Paths
const packageJsonPath = path.join(__dirname, '../package.json');
const buildGradlePath = path.join(__dirname, '../android/app/build.gradle');
const angularEnvPath = path.join(__dirname, '../src/environments/environment.ts');
const angularEnvProdPath = path.join(__dirname, '../src/environments/environment.prod.ts');
const cachePath = path.join(__dirname, 'version-cache.json');

console.log('Running script to update versions...');

// 1. Read package.json to get the current version
let currentVersion;
try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    currentVersion = packageJson.version;
    console.log(`App version found in package.json: ${currentVersion}`);
} catch (e) {
    console.error('Error reading package.json:', e);
    process.exit(1);
}

// 2. Read the cache file to get the last version
let lastVersion = '0.0.0';
try {
    if (fs.existsSync(cachePath)) {
        const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
        lastVersion = cache.lastVersionName;
    }
} catch (e) {
    console.warn('Could not read version cache file. Assuming first run.', e);
}

// =============================================
// Update Android
// =============================================
function updateAndroidVersion() {
    console.log('Updating Android build.gradle...');
    let buildGradleContent;
    try {
        buildGradleContent = fs.readFileSync(buildGradlePath, 'utf8');
    } catch (e) {
        console.error('Error reading build.gradle:', e);
        return;
    }

    // Inject the helper function if it doesn't exist
    if (!buildGradleContent.includes('def getPackageVersionName()')) {
        const getVersionFunction = `
// Function to read and parse package.json
def getPackageVersionName() {
    def packageFile = new File("$rootDir/../../package.json")
    if (packageFile.exists()) {
        def packageJson = new groovy.json.JsonSlurper().parseText(packageFile.text)
        return packageJson.version
    }
    return "0.0.0" // Default value
}
`;
        buildGradleContent = buildGradleContent.replace(
            "apply plugin: 'com.android.application'",
            "apply plugin: 'com.android.application'\n" + getVersionFunction
        );
        // Set versionName and add the version string resource
        buildGradleContent = buildGradleContent.replace(
            /versionName ".*"/,
            'versionName getPackageVersionName()\n        resValue "string", "app_version", "v" + getPackageVersionName()'
        );
    }

    // Conditionally increment versionCode
    if (currentVersion !== lastVersion) {
        console.log(`Version changed from ${lastVersion} to ${currentVersion}. Incrementing versionCode.`);
        const versionCodeRegex = /versionCode\s+(\d+)/;
        const match = buildGradleContent.match(versionCodeRegex);
        if (match) {
            const currentCode = parseInt(match[1], 10);
            const newCode = currentCode + 1;
            console.log(`Incrementing versionCode from ${currentCode} to ${newCode}.`);
            buildGradleContent = buildGradleContent.replace(versionCodeRegex, `versionCode ${newCode}`);
        } else {
            console.warn('Could not find versionCode in build.gradle.');
        }
    } else {
        console.log('App version is unchanged. Skipping versionCode increment.');
    }

    try {
        fs.writeFileSync(buildGradlePath, buildGradleContent, 'utf8');
        console.log('Successfully updated build.gradle.');
    } catch (e) {
        console.error('Error writing updated build.gradle:', e);
    }
}

// =============================================
// Update Angular Environment Files
// =============================================
function updateAngularVersion() {
    console.log('Updating Angular environment files...');
    [angularEnvPath, angularEnvProdPath].forEach(filePath => {
        try {
            let content = fs.readFileSync(filePath, 'utf8');
            if (/appVersion:/.test(content)) {
                content = content.replace(/appVersion: '.*'/, `appVersion: '${currentVersion}'`);
            } else {
                content = content.replace(
                    'export const environment = {',
                    `export const environment = {\n  appVersion: '${currentVersion}',`
                );
            }
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`Successfully updated ${path.basename(filePath)}.`);
        } catch (e) {
            console.error(`Error updating ${path.basename(filePath)}:`, e);
        }
    });
}

// =============================================
// Main Execution
// =============================================
updateAndroidVersion();
updateAngularVersion();

// 4. Write the new version to the cache for the next run
try {
    const cache = { lastVersionName: currentVersion };
    fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), 'utf8');
    console.log(`Updated version cache to ${currentVersion}.`);
} catch (e) {
    console.error('Error writing version cache file:', e);
}

console.log('Version update script finished.');
