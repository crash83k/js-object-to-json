'use strict';

const fs = require('fs');
const args = process.argv;

// Validate Arguments.
if (!args[2])
  throw new Error("No input path submitted.");

// Create input/output paths
let inputPath = args[2],
  outputPath = inputPath;

// Make sure the input path exists.
if (!fs.existsSync(inputPath))
  throw new Error(`${inputPath} is not a valid path.`);

// Validate the output path if one exists.
if (args[3]) {
  // Overwrite the default output path.
  outputPath = args[3];
  // Make sure the output path is valid.
  if (!fs.existsSync(outputPath))
    throw new Error(`${outputPath} is not a valid path.`);
} else {
  console.warn('Note: No output path defined. Using input path.');
}

// Ensure we have a trailing slash on input path.
if (inputPath.substr(inputPath.length - 1, 1) !== '/') {
  inputPath += '/';
}

// Ensure we have a trailing slash on output path.
if (outputPath.substr(outputPath.length - 1, 1) !== '/') {
  outputPath += '/';
}

// Find all the files in the top layer of the dir.
console.info('Finding files in directory:', inputPath);
fs.readdir(inputPath, async(err, files) => {
  if (err)
    throw new Error(err);

  // Filter out any non-JS files.
  files = files.filter(file => {
    const parts = file.split('.');
    return parts.pop().toLowerCase() === 'js';
  });

  // If no files were found, exit.
  if (files.length < 1) {
    console.error("There are no .js files to compile.");
    process.exit(1);
  }

  // Loop through the files and send them to the compiler.
  console.info('Found JS files:', files);
  for (let file of files) {
    await compileJson(inputPath + file, outputPath + file + 'on')
      .then(console.info)
      .catch(console.error);
  }
});

/**
 * Compiling function - takes a path to a file, require() the file,
 * then converts the resulting object to a JSON string. Finally
 * writes the contents to a JSON file.
 * @param inputFile String
 * @param outputFile String
 * @returns {Promise<any>}
 */
function compileJson(inputFile, outputFile) {
  // To prevent memory leaks or buffer overflow, we return a promise we can await.
  return new Promise((resolve, reject) => {
    let contents;
    try {
      // Get the parsed contents of the JS file.
      contents = require(inputFile);
    } catch (err) {
      return reject(err);
    }

    // Make sure we have an object.
    if (typeof contents !== 'object') {
      return reject(`Error: ${inputFile} didn't return an object. Skipping it.`);
    }
    // Make sure our object isn't empty.
    else if (Object.keys(contents).length === 0) {
      return reject(`Error: ${inputFile} returns an empty object. Skipping it.`);
    }
    // Good to go.
    else {
      let jsonString;
      try {
        // Use native JS to stringify the object.
        jsonString = JSON.stringify(contents);
      } catch (err) {
        return reject(`Error: Unable to stringify ${inputFile}. Skipping it.`);
      }

      // Delete existing files.
      if (fs.existsSync(outputFile)) {
        fs.unlinkSync(outputFile);
      }

      // Now write the new JSON string to a file.
      fs.writeFile(outputFile, jsonString, {
        mode: 775
      }, err => {
        if (err)
          return reject(`Error: Unable to write to output file ${outputFile}. Skipping it.`);
        return resolve(`Successfully wrote ${outputFile}. (${jsonString.length} bytes)`);
      });
    }
  });
}
