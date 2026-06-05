const fs = require('fs');

function extractAndPrefixCss(inputFile, outputFile, prefix) {
  const content = fs.readFileSync(inputFile, 'utf-8');
  const styleMatch = content.match(/<style>([\s\S]*?)<\/style>/);
  if (!styleMatch) {
    console.error('No style tag found in ' + inputFile);
    return;
  }
  let css = styleMatch[1];
  
  // Basic prefixing (this is naive but works for simple selectors)
  // We'll just replace rules like `.class {` with `.prefix .class {`
  // And also handle commas, etc.
  // Actually, since there are media queries, it's safer to just let it be, but replace `:root` with the prefix, and `body` with the prefix.
  
  css = css.replace(/:root/g, `.${prefix}`);
  css = css.replace(/^body\s*\{/gm, `.${prefix} {`);
  css = css.replace(/body\.show-en/g, `.${prefix}.show-en`);
  css = css.replace(/@media print\s*\{([\s\S]*?)\}/g, (match, p1) => {
    let p1Replaced = p1.replace(/body\s*\{/g, `.${prefix} {`);
    return `@media print {${p1Replaced}}`;
  });
  
  // To avoid global bleeding for generic tags like *
  css = css.replace(/^\*\s*\{/gm, `.${prefix} * {`);
  css = css.replace(/^html, body\s*\{/gm, `.${prefix} {`);
  
  // Prefix all lines starting with a dot, except inside keyframes or strings if any
  // A simple way: add `.prefix ` to any line that starts with `.` or `#` or a tag name if it's not indented (assuming the CSS is formatted with selectors at line start)
  const lines = css.split('\n');
  const prefixedLines = lines.map(line => {
    if (line.startsWith('.') && !line.startsWith(`.${prefix}`)) {
      return `.${prefix} ` + line;
    }
    if (line.startsWith('ruby')) {
        return `.${prefix} ` + line;
    }
    return line;
  });

  fs.writeFileSync(outputFile, prefixedLines.join('\n'));
  console.log('Created ' + outputFile);
}

extractAndPrefixCss('6-1-tekudasai-lesson.html', 'frontend/src/pages/GrammarLesson.css', 'grammar-lesson-page');
extractAndPrefixCss('topic-talk-tomodachi.html', 'frontend/src/pages/TopicTalkLesson.css', 'topic-talk-lesson-page');
// For TravelLesson, copy GrammarLesson's CSS
fs.copyFileSync('frontend/src/pages/GrammarLesson.css', 'frontend/src/pages/TravelLesson.css');
const travelContent = fs.readFileSync('frontend/src/pages/TravelLesson.css', 'utf-8');
fs.writeFileSync('frontend/src/pages/TravelLesson.css', travelContent.replace(/grammar-lesson-page/g, 'travel-lesson-page'));

console.log('CSS extraction complete.');
