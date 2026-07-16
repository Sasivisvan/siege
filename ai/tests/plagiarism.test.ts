import { describe, it, expect } from 'vitest';
import { calculateSimilarity } from '../plagiarism/detector';

describe('Plagiarism Detector', () => {
  it('should detect identical code as 100% similar', () => {
    const code = `function add(a, b) { return a + b; }`;
    const result = calculateSimilarity(code, code);
    expect(result.similarityScore).toBe(100);
    expect(result.isPlagiarized).toBe(true);
  });

  it('should detect high similarity when variables are renamed', () => {
    const sourceA = `
      function calculateSum(array) {
        let sum = 0;
        for (let i = 0; i < array.length; i++) {
          sum += array[i];
        }
        return sum;
      }
    `;
    const sourceB = `
      function getSum(arr) {
        let total = 0;
        for (let j = 0; j < arr.length; j++) {
          total += arr[j];
        }
        return total;
      }
    `;
    
    const result = calculateSimilarity(sourceA, sourceB, 80);
    // Jaccard should catch the structural similarity
    expect(result.isPlagiarized).toBe(true);
    expect(result.similarityScore).toBeGreaterThan(80);
  });

  it('should not flag completely different code', () => {
    const sourceA = `function hello() { console.log('hello world'); }`;
    const sourceB = `class User { constructor(name) { this.name = name; } }`;
    
    const result = calculateSimilarity(sourceA, sourceB, 80);
    expect(result.isPlagiarized).toBe(false);
    expect(result.similarityScore).toBeLessThan(50);
  });
});
