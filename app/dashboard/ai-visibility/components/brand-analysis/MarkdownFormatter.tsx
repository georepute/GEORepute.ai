"use client";
import React from 'react';

interface MarkdownFormatterProps {
  content: string;
  highlightTerms?: Array<{
    term: string;
    className?: string;
  }>;
}

export const MarkdownFormatter: React.FC<MarkdownFormatterProps> = ({ 
  content,
  highlightTerms = []
}) => {
  // Process and render markdown content
  const renderMarkdown = () => {
    if (!content) return null;
    
    // Split content into lines
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let key = 0;
    
    // Track list state
    let inList = false;
    let listItems: React.ReactNode[] = [];
    let listType: 'ul' | 'ol' | null = null;
    
    // Track code block state
    let inCodeBlock = false;
    let codeContent: string[] = [];
    let codeLanguage = '';
    
    // Track table state
    let inTable = false;
    let tableHeaders: string[] = [];
    let tableRows: string[][] = [];
    
    // Helper to flush list when needed
    const flushList = () => {
      if (listItems.length > 0) {
        if (listType === 'ul') {
          elements.push(
            <ul key={`list-${key++}`} className="list-disc pl-6 my-2 space-y-1">
              {listItems}
            </ul>
          );
        } else if (listType === 'ol') {
          elements.push(
            <ol key={`list-${key++}`} className="list-decimal pl-6 my-2 space-y-1">
              {listItems}
            </ol>
          );
        }
        listItems = [];
        listType = null;
        inList = false;
      }
    };
    
    // Helper to flush code block when needed
    const flushCodeBlock = () => {
      if (inCodeBlock && codeContent.length > 0) {
        elements.push(
          <pre key={`code-${key++}`} className="bg-muted/60 p-3 rounded-md my-2 overflow-x-auto">
            <code className="text-sm font-mono whitespace-pre text-inherit">
              {codeContent.join('\n')}
            </code>
          </pre>
        );
        codeContent = [];
        codeLanguage = '';
        inCodeBlock = false;
      }
    };
    
    // Helper to flush table when needed
    const flushTable = () => {
      if (inTable && tableHeaders.length > 0) {
        elements.push(
          <div key={`table-wrapper-${key++}`} className="my-4 overflow-x-auto">
            <table className="min-w-full border-collapse border border-border">
              <thead className="bg-muted/50">
                <tr>
                  {tableHeaders.map((header, i) => (
                    <th key={`th-${key}-${i}`} className="border border-border px-4 py-2 text-left font-semibold text-sm">
                      {formatInlineElements(header.trim())}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row, rowIndex) => (
                  <tr key={`tr-${key}-${rowIndex}`} className={rowIndex % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                    {row.map((cell, cellIndex) => (
                      <td key={`td-${key}-${rowIndex}-${cellIndex}`} className="border border-border px-4 py-2 text-sm">
                        {formatInlineElements(cell.trim())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        tableHeaders = [];
        tableRows = [];
        inTable = false;
      }
    };
    
    // Process each line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Handle code blocks
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          // End of code block
          flushCodeBlock();
        } else {
          // Start of code block
          inCodeBlock = true;
          codeLanguage = line.substring(3).trim();
          flushList(); // Make sure to close any open lists
          flushTable(); // Make sure to close any open tables
        }
        continue;
      }
      
      if (inCodeBlock) {
        codeContent.push(line);
        continue;
      }
      
      // Handle table rows (markdown tables use | as delimiter)
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell);
        
        // Check if this is a separator row (e.g., |---|---|)
        const isSeparator = cells.every(cell => /^[-:]+$/.test(cell));
        
        if (isSeparator) {
          // This is the separator between header and body, skip it
          continue;
        }
        
        if (!inTable) {
          // First row is the header
          flushList();
          flushCodeBlock();
          inTable = true;
          tableHeaders = cells;
        } else {
          // Subsequent rows are data
          tableRows.push(cells);
        }
        continue;
      } else if (inTable) {
        // We've left the table, flush it
        flushTable();
      }
      
      // Handle empty lines
      if (!line.trim()) {
        flushList();
        flushTable();
        elements.push(<div key={`empty-${key++}`} className="h-2" />);
        continue;
      }
      
      // Handle headings
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        flushList();
        flushTable();
        const level = headingMatch[1].length;
        const text = headingMatch[2].trim();
        
        switch (level) {
          case 1:
            elements.push(<h1 key={`h1-${key++}`} className="text-2xl font-bold mt-4 mb-2 text-inherit">{text}</h1>);
            break;
          case 2:
            elements.push(<h2 key={`h2-${key++}`} className="text-xl font-bold mt-3 mb-2 text-inherit">{text}</h2>);
            break;
          case 3:
            elements.push(<h3 key={`h3-${key++}`} className="text-lg font-semibold mt-3 mb-1 text-inherit">{text}</h3>);
            break;
          default:
            elements.push(<h4 key={`h4-${key++}`} className="text-base font-semibold mt-2 mb-1 text-inherit">{text}</h4>);
        }
        continue;
      }
      
      // Handle unordered lists
      const ulMatch = line.match(/^(\s*)[*\-•]\s+(.+)$/);
      if (ulMatch) {
        flushTable();
        if (!inList || listType !== 'ul') {
          flushList();
          inList = true;
          listType = 'ul';
        }
        
        listItems.push(
          <li key={`li-${key++}`} className="text-sm text-inherit">
            {formatInlineElements(ulMatch[2])}
          </li>
        );
        continue;
      }
      
      // Handle ordered lists
      const olMatch = line.match(/^(\s*)\d+\.\s+(.+)$/);
      if (olMatch) {
        flushTable();
        if (!inList || listType !== 'ol') {
          flushList();
          inList = true;
          listType = 'ol';
        }
        
        listItems.push(
          <li key={`li-${key++}`} className="text-sm text-inherit">
            {formatInlineElements(olMatch[2])}
          </li>
        );
        continue;
      }
      
      // Handle paragraphs (default)
      flushList();
      flushTable();
      elements.push(
        <p key={`p-${key++}`} className="text-sm my-2 text-inherit">
          {formatInlineElements(line)}
        </p>
      );
    }
    
    // Flush any remaining lists, tables, or code blocks
    flushList();
    flushTable();
    flushCodeBlock();
    
    return elements;
  };
  
  // Format inline elements like bold, italic, code, links
  const formatInlineElements = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let currentText = '';
    let key = 0;
    
    // Helper to add current text to parts with term highlighting
    const flushText = () => {
      if (!currentText) return;
      
      // If we have terms to highlight
      if (highlightTerms.length > 0) {
        // Start with the current text
        let remainingText = currentText;
        let textParts: React.ReactNode[] = [];
        let textKey = 0;
        
        // Process each highlight term
        highlightTerms.forEach(({ term, className }) => {
          if (!term) return;
          
          const termRegex = new RegExp(`(${term})`, 'gi');
          let lastIndex = 0;
          let match;
          let tempParts: React.ReactNode[] = [];
          
          // Find all instances of the term
          while (remainingText && (match = termRegex.exec(remainingText)) !== null) {
            // Add text before the match
            if (match.index > lastIndex) {
              tempParts.push(
                <span key={`text-${textKey++}`} className="text-inherit">
                  {remainingText.substring(lastIndex, match.index)}
                </span>
              );
            }
            
            // Add the highlighted term
            tempParts.push(
              <span 
                key={`highlight-${textKey++}`} 
                className={className || "bg-yellow-100 dark:bg-yellow-900/40 px-1 rounded text-inherit"}
              >
                {match[0]}
              </span>
            );
            
            lastIndex = match.index + match[0].length;
          }
          
          // Add any remaining text
          if (lastIndex < remainingText.length) {
            tempParts.push(
              <span key={`text-${textKey++}`} className="text-inherit">
                {remainingText.substring(lastIndex)}
              </span>
            );
          }
          
          // Update the remaining text for the next term
          if (tempParts.length > 0) {
            remainingText = '';
            textParts = tempParts;
          }
        });
        
        // If we processed any terms, add the parts
        if (textParts.length > 0) {
          parts.push(...textParts);
        } else {
          // Otherwise just add the text as-is
          parts.push(<span key={`text-${key++}`} className="text-inherit">{currentText}</span>);
        }
      } else {
        // No terms to highlight, just add the text
        parts.push(<span key={`text-${key++}`} className="text-inherit">{currentText}</span>);
      }
      
      currentText = '';
    };

    let i = 0;
    while (i < text.length) {
      // Handle bold (**text**)
      if (text.substring(i, i + 2) === '**' && text.indexOf('**', i + 2) !== -1) {
        const endBold = text.indexOf('**', i + 2);
        flushText();
        const boldContent = text.substring(i + 2, endBold);
        parts.push(<strong key={`bold-${key++}`} className="font-semibold text-inherit">{boldContent}</strong>);
        i = endBold + 2;
        continue;
      }
      
      // Handle italic (*text* or _text_)
      if ((text[i] === '*' || text[i] === '_') && 
          text.indexOf(text[i], i + 1) !== -1 && 
          (i === 0 || text[i-1] !== '*') && (i+1 >= text.length || text[i+1] !== '*')) { // Avoid confusion with bold
        const marker = text[i];
        const endItalic = text.indexOf(marker, i + 1);
        flushText();
        const italicContent = text.substring(i + 1, endItalic);
        parts.push(<em key={`italic-${key++}`} className="italic text-inherit">{italicContent}</em>);
        i = endItalic + 1;
        continue;
      }
      
      // Handle inline code (`text`)
      if (text[i] === '`' && text.indexOf('`', i + 1) !== -1) {
        const endCode = text.indexOf('`', i + 1);
        flushText();
        const codeContent = text.substring(i + 1, endCode);
        parts.push(
          <code key={`inline-code-${key++}`} className="bg-muted/60 px-1.5 py-0.5 rounded text-xs font-mono text-inherit">
            {codeContent}
          </code>
        );
        i = endCode + 1;
        continue;
      }
      
      // Handle links [text](url)
      if (text[i] === '[' && 
          text.indexOf('](', i) !== -1 && 
          text.indexOf(')', text.indexOf('](', i)) !== -1) {
        const textEnd = text.indexOf('](', i);
        const linkEnd = text.indexOf(')', textEnd);
        
        flushText();
        const linkText = text.substring(i + 1, textEnd);
        const linkUrl = text.substring(textEnd + 2, linkEnd);
        
        parts.push(
          <a 
            key={`link-${key++}`} 
            href={linkUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="underline text-inherit hover:opacity-90"
          >
            {linkText}
          </a>
        );
        
        i = linkEnd + 1;
        continue;
      }
      
      // Regular text
      currentText += text[i];
      i++;
    }
    
    // Add any remaining text
    flushText();
    
    return parts;
  };
  
  return (
    <div className="markdown-content text-sm">
      {renderMarkdown()}
    </div>
  );
}; 