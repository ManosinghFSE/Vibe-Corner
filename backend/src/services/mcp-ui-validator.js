import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

// UI Validation checks
const uiChecks = {
  // Layout checks
  async checkResponsiveness(page) {
    const viewports = [
      { width: 375, height: 667, name: 'Mobile' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 1920, height: 1080, name: 'Desktop' }
    ];
    
    const issues = [];
    for (const viewport of viewports) {
      await page.setViewport(viewport);
      await page.waitForTimeout(500);
      
      // Check for horizontal overflow
      const hasOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      
      if (hasOverflow) {
        issues.push(`Horizontal overflow detected on ${viewport.name}`);
      }
      
      // Check for overlapping elements
      const overlaps = await page.evaluate(() => {
        const elements = document.querySelectorAll('.vc-card, .btn, .form-control');
        const overlapping = [];
        
        for (let i = 0; i < elements.length; i++) {
          const rect1 = elements[i].getBoundingClientRect();
          for (let j = i + 1; j < elements.length; j++) {
            const rect2 = elements[j].getBoundingClientRect();
            
            if (!(rect1.right < rect2.left || 
                  rect1.left > rect2.right || 
                  rect1.bottom < rect2.top || 
                  rect1.top > rect2.bottom)) {
              overlapping.push({
                elem1: elements[i].className,
                elem2: elements[j].className
              });
            }
          }
        }
        return overlapping;
      });
      
      if (overlaps.length > 0) {
        issues.push(`Overlapping elements on ${viewport.name}: ${JSON.stringify(overlaps)}`);
      }
    }
    
    return issues;
  },
  
  // Accessibility checks
  async checkAccessibility(page) {
    const issues = [];
    
    // Check for missing alt text
    const missingAlt = await page.evaluate(() => {
      const images = document.querySelectorAll('img');
      return Array.from(images).filter(img => !img.alt).length;
    });
    
    if (missingAlt > 0) {
      issues.push(`${missingAlt} images missing alt text`);
    }
    
    // Check for color contrast
    const lowContrast = await page.evaluate(() => {
      function getContrast(rgb1, rgb2) {
        const lum1 = getLuminance(rgb1);
        const lum2 = getLuminance(rgb2);
        const brightest = Math.max(lum1, lum2);
        const darkest = Math.min(lum1, lum2);
        return (brightest + 0.05) / (darkest + 0.05);
      }
      
      function getLuminance(rgb) {
        const [r, g, b] = rgb.match(/\d+/g).map(Number);
        const [rs, gs, bs] = [r, g, b].map(c => {
          c = c / 255;
          return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
      }
      
      const elements = document.querySelectorAll('*');
      const lowContrastElements = [];
      
      elements.forEach(el => {
        const style = window.getComputedStyle(el);
        const bg = style.backgroundColor;
        const fg = style.color;
        
        if (bg !== 'rgba(0, 0, 0, 0)' && fg !== 'rgba(0, 0, 0, 0)') {
          const contrast = getContrast(bg, fg);
          if (contrast < 4.5) {
            lowContrastElements.push({
              element: el.tagName + '.' + el.className,
              contrast: contrast.toFixed(2)
            });
          }
        }
      });
      
      return lowContrastElements.slice(0, 5); // Return top 5 issues
    });
    
    if (lowContrast.length > 0) {
      issues.push(`Low color contrast elements: ${JSON.stringify(lowContrast)}`);
    }
    
    // Check for keyboard navigation
    const focusableElements = await page.evaluate(() => {
      const elements = document.querySelectorAll('a, button, input, select, textarea, [tabindex]');
      return Array.from(elements).filter(el => {
        const tabindex = el.getAttribute('tabindex');
        return tabindex !== '-1';
      }).length;
    });
    
    if (focusableElements === 0) {
      issues.push('No keyboard-focusable elements found');
    }
    
    return issues;
  },
  
  // Performance checks
  async checkPerformance(page) {
    const issues = [];
    
    // Check image sizes
    const largeImages = await page.evaluate(() => {
      const images = document.querySelectorAll('img');
      return Array.from(images).filter(img => {
        return img.naturalWidth > 2000 || img.naturalHeight > 2000;
      }).map(img => ({
        src: img.src,
        width: img.naturalWidth,
        height: img.naturalHeight
      }));
    });
    
    if (largeImages.length > 0) {
      issues.push(`Large unoptimized images found: ${JSON.stringify(largeImages)}`);
    }
    
    // Check for animation performance
    const animationCount = await page.evaluate(() => {
      const animated = document.querySelectorAll('[class*="animate"], [class*="fade"], [class*="slide"]');
      return animated.length;
    });
    
    if (animationCount > 50) {
      issues.push(`Too many animated elements (${animationCount}), may impact performance`);
    }
    
    // Check DOM size
    const domSize = await page.evaluate(() => document.querySelectorAll('*').length);
    if (domSize > 3000) {
      issues.push(`Large DOM size (${domSize} elements), consider virtualization`);
    }
    
    return issues;
  },
  
  // Visual regression checks
  async checkVisualConsistency(page) {
    const issues = [];
    
    // Check for consistent spacing
    const inconsistentSpacing = await page.evaluate(() => {
      const cards = document.querySelectorAll('.vc-card');
      const margins = new Set();
      const paddings = new Set();
      
      cards.forEach(card => {
        const style = window.getComputedStyle(card);
        margins.add(style.margin);
        paddings.add(style.padding);
      });
      
      return {
        marginVariations: margins.size,
        paddingVariations: paddings.size
      };
    });
    
    if (inconsistentSpacing.marginVariations > 3) {
      issues.push(`Inconsistent card margins (${inconsistentSpacing.marginVariations} variations)`);
    }
    
    if (inconsistentSpacing.paddingVariations > 3) {
      issues.push(`Inconsistent card paddings (${inconsistentSpacing.paddingVariations} variations)`);
    }
    
    // Check for consistent colors
    const colorConsistency = await page.evaluate(() => {
      const buttons = document.querySelectorAll('.btn-primary, .vc-btn-primary');
      const colors = new Set();
      
      buttons.forEach(btn => {
        const style = window.getComputedStyle(btn);
        colors.add(style.backgroundColor);
      });
      
      return colors.size;
    });
    
    if (colorConsistency > 2) {
      issues.push(`Inconsistent primary button colors (${colorConsistency} variations)`);
    }
    
    return issues;
  },
  
  // Content checks
  async checkContent(page) {
    const issues = [];
    
    // Check for placeholder content
    const placeholders = await page.evaluate(() => {
      const text = document.body.innerText;
      const placeholderPatterns = [
        /lorem ipsum/i,
        /placeholder/i,
        /test data/i,
        /dummy/i,
        /TODO/i
      ];
      
      return placeholderPatterns.filter(pattern => pattern.test(text));
    });
    
    if (placeholders.length > 0) {
      issues.push(`Placeholder content detected`);
    }
    
    // Check for broken links
    const brokenLinks = await page.evaluate(() => {
      const links = document.querySelectorAll('a[href]');
      return Array.from(links).filter(link => {
        const href = link.getAttribute('href');
        return href === '#' || href === 'javascript:void(0)' || href === '';
      }).length;
    });
    
    if (brokenLinks > 0) {
      issues.push(`${brokenLinks} broken or placeholder links found`);
    }
    
    return issues;
  }
};

// MCP Server implementation
class UIValidatorServer {
  constructor() {
    this.server = new Server(
      {
        name: 'vibecorner-ui-validator',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );
    
    this.setupHandlers();
  }
  
  setupHandlers() {
    this.server.setRequestHandler('tools/list', async () => ({
      tools: [
        {
          name: 'validate_ui',
          description: 'Run comprehensive UI validation checks',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'URL to validate',
              },
              checks: {
                type: 'array',
                items: {
                  type: 'string',
                  enum: ['responsiveness', 'accessibility', 'performance', 'visual', 'content', 'all']
                },
                description: 'Which checks to run (default: all)',
              }
            },
            required: ['url'],
          },
        },
        {
          name: 'screenshot',
          description: 'Take screenshots of the UI',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'URL to screenshot',
              },
              viewport: {
                type: 'object',
                properties: {
                  width: { type: 'number' },
                  height: { type: 'number' },
                },
              },
              fullPage: {
                type: 'boolean',
                description: 'Capture full page screenshot',
              }
            },
            required: ['url'],
          },
        },
      ],
    }));
    
    this.server.setRequestHandler('tools/call', async (request) => {
      if (request.params.name === 'validate_ui') {
        return await this.validateUI(request.params.arguments);
      } else if (request.params.name === 'screenshot') {
        return await this.takeScreenshot(request.params.arguments);
      }
      
      throw new Error(`Unknown tool: ${request.params.name}`);
    });
  }
  
  async validateUI({ url, checks = ['all'] }) {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    try {
      await page.goto(url, { waitUntil: 'networkidle2' });
      await page.waitForTimeout(2000); // Wait for animations
      
      const results = {};
      const runChecks = checks.includes('all') ? 
        ['responsiveness', 'accessibility', 'performance', 'visual', 'content'] : 
        checks;
      
      for (const check of runChecks) {
        switch (check) {
          case 'responsiveness':
            results.responsiveness = await uiChecks.checkResponsiveness(page);
            break;
          case 'accessibility':
            results.accessibility = await uiChecks.checkAccessibility(page);
            break;
          case 'performance':
            results.performance = await uiChecks.checkPerformance(page);
            break;
          case 'visual':
            results.visual = await uiChecks.checkVisualConsistency(page);
            break;
          case 'content':
            results.content = await uiChecks.checkContent(page);
            break;
        }
      }
      
      const allIssues = Object.values(results).flat();
      const summary = {
        totalIssues: allIssues.length,
        critical: allIssues.filter(i => i.includes('overflow') || i.includes('contrast')).length,
        warnings: allIssues.length - allIssues.filter(i => i.includes('overflow') || i.includes('contrast')).length,
        results
      };
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(summary, null, 2),
          },
        ],
      };
    } finally {
      await browser.close();
    }
  }
  
  async takeScreenshot({ url, viewport = { width: 1920, height: 1080 }, fullPage = false }) {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    try {
      await page.setViewport(viewport);
      await page.goto(url, { waitUntil: 'networkidle2' });
      await page.waitForTimeout(2000);
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `screenshot-${timestamp}.png`;
      const filepath = path.join(process.cwd(), 'screenshots', filename);
      
      // Ensure directory exists
      fs.mkdirSync(path.dirname(filepath), { recursive: true });
      
      await page.screenshot({
        path: filepath,
        fullPage,
      });
      
      return {
        content: [
          {
            type: 'text',
            text: `Screenshot saved to: ${filepath}`,
          },
        ],
      };
    } finally {
      await browser.close();
    }
  }
  
  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('MCP UI Validator Server running on stdio');
  }
}

// Run the server
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new UIValidatorServer();
  server.run().catch(console.error);
}

export { UIValidatorServer, uiChecks }; 