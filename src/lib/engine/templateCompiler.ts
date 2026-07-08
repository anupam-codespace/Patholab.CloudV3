import Handlebars from "handlebars";

// 1. Clinical Helpers
Handlebars.registerHelper('isAbnormal', function(flag: string, options: any) {
  if (flag === 'HIGH' || flag === 'LOW') {
    return options.fn(this);
  }
  return options.inverse(this);
});

Handlebars.registerHelper('colorFlag', function(flag: string) {
  if (flag === 'HIGH') return '#ef4444'; // Red
  if (flag === 'LOW') return '#3b82f6'; // Blue
  return '#1e293b'; // Slate 800 (Normal)
});

Handlebars.registerHelper('uppercase', function(str: string) {
  return typeof str === 'string' ? str.toUpperCase() : str;
});

// 2. The Compiler Function
export function compileTemplateString(templateString: string, context: any): string {
  if (!templateString) return "";
  try {
    const template = Handlebars.compile(templateString, {
      strict: false, // Don't crash on missing variables
      noEscape: true // Allow HTML rendering if needed
    });
    return template(context);
  } catch (error) {
    console.error("Template Compilation Error:", error);
    return `[Template Error: ${error}]`;
  }
}