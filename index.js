var fs = require('fs');
var path = require('path');
var rework = require('rework');
var cliArgs = require('command-line-args');
var _ = require('lodash');

/* define the command-line options */
var cli = cliArgs([
  { name: 'verbose', type: Boolean, alias: 'v', description: 'Write plenty output' },
  { name: 'help', type: Boolean, description: 'Print usage instructions' },
  { name: 'directories', type: Array, defaultOption: true, description: 'The directory that contains fonts.com demo.css' }
]);
 
/* parse the supplied command-line values */
var options = cli.parse();
 
/* generate a usage guide */
var usage = cli.getUsage({
  header: 'A synopsis application.',
  footer: 'For more information, visit https://github.com/preciousforever/rename-fonts.com-download-kit-webfonts'
});

var directories = options.directories;

if(options.help || !directories.length) {
  usage;
  process.exit();
}

var less = '.includeFont(@name, @path) { \n\
  @font-face { \n\
    font-family: @name; \n\
    src: url("assets/@{path}.eot?#iefix"); \n\
    src: \n\
      url("assets/@{path}.eot?#iefix") format("eot"), \n\
      url("assets/@{path}.woff2") format("woff2"), \n\
      url("assets/@{path}.woff") format("woff"), \n\
      url("assets/@{path}.ttf") format("truetype"), \n\
      url("assets/@{path}.svg#@{path}") format("svg"); \n\
  } \n\
} \n\
';

function processDirectory(dir) { 
  if(!fs.existsSync(dir) || !fs.lstatSync(dir).isDirectory()) {
    console.error(dir + "is not a directory");
    return;
  }
  var demoCss = dir + path.sep + 'demo.css';
  if(!fs.existsSync(demoCss)) {
    console.error(demoCss + " does not exists. Is " + dir + " a fonts.com download?");
    return;
  }
  var fontFolder = dir + path.sep + 'Fonts';
  if(!fs.existsSync(fontFolder) || !fs.lstatSync(fontFolder).isDirectory()) {
    console.error(fontFolder + " does not exists. Is " + dir + " a fonts.com download?");
    return;
  }

  var targetFontFolder = dir + path.sep + 'renamed';
  if(!fs.existsSync(targetFontFolder)) {
    console.log(targetFontFolder + " does not exists. Creating ..");
    fs.mkdirSync(targetFontFolder);
  }

  // read css
  var css = fs.readFileSync(demoCss, "utf-8");

  var files = fs.readdirSync(fontFolder);


  rework(css)
    .use(function(root) {
      if(!root.rules) {
        return;
      }
      root.rules.forEach(function(rule) {
        if(rule.type != 'font-face') {
          return;
        }
        var currentFont;
        var currentPath;
        rule.declarations.forEach(function(declaration) {
          if(declaration.property == 'font-family') {
            currentFont = declaration.value;
            return;
          }
          if(declaration.property == 'src') {
            currentPath = declaration.value;
            return;
          }
        });

        if(!currentFont || !currentPath) {
          return;
        }

        // path is something like url("Fonts/68a80fcf-c69a-4999-b379-0d4592190673.eot?#iefix")
        var matches = currentPath.match(/url\(\"Fonts\/([a-zA-Z0-9-]*\.[a-z2]*)/g);
        if(!matches) {
          return;
        }

        var fileName = _.kebabCase(currentFont);
        var fontName = _.startCase(currentFont);

        matches.forEach(function(match) {
          var filePath = match.replace('url("', '');
          var newPath = dir + path.sep + 'renamed' + path.sep + fileName + path.extname(filePath);
          console.log("rename ", filePath, newPath);
          fs.createReadStream(dir + path.sep + filePath).pipe(fs.createWriteStream(newPath));
        });

        // generate less

        less += ".includeFont('" + fontName + "', '" + fileName + "'); \n"

      });

    });

  fs.writeFileSync(dir + path.sep + 'renamed.less', less, 'utf-8');
}

directories.forEach(processDirectory);