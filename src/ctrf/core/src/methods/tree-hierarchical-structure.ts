import type { Test, TestStatus, Summary } from '../../types/ctrf'
import { isTestFlaky } from './run-insights'

/**
 * Tree test extends CTRF Test with a nodeType field for tree traversal
 */
export type TreeTest = Test & {
  /** Node type identifier - always "test" for tree traversal */
  nodeType: 'test'
}

/**
 * Represents a tree node (suite) that can contain tests and child suites
 * Following the CTRF Suite Tree schema specification
 */
export interface TreeNode {
  /** The name of this suite */
  name: string
  /** The status of this suite (derived from child test results) */
  status: TestStatus
  /** Total duration of all tests in this suite and children */
  duration: number
  /** Aggregated statistics for this suite (only present when includeSummary is true) */
  summary?: Summary
  /** Tests directly contained in this suite */
  tests: TreeTest[]
  /** Child suites contained within this suite */
  suites: TreeNode[]
  /** Additional properties */
  extra?: Record<string, unknown>
}

/**
 * Options for controlling tree structure creation
 */
export interface TreeOptions {
  /** Whether to include summary statistics aggregation (default: true) */
  includeSummary?: boolean
}

/**
 * Result of converting tests to tree structure
 */
export interface TestTree {
  /** Root nodes of the tree (top-level suites) */
  roots: TreeNode[]
  /** Overall statistics for all tests (only present when includeSummary is true) */
  summary?: Summary
}

/**
 * Organizes CTRF tests into a hierarchical tree structure based on the suite property.
 *
 * The function handles array format (['suite1', 'suite2', 'suite3']) for the suite property
 * as defined in the CTRF schema. The output follows the CTRF Suite Tree schema specification.
 *
 * @param tests - Array of CTRF test objects
 * @param options - Options for controlling tree creation
 * @returns TestTree object containing the hierarchical structure and statistics
 *
 * @example
 * ```typescript
 * import { organizeTestsBySuite } from 'ctrf-js-common'
 *
 * const tests = [
 *   {
 *     name: 'should login successfully',
 *     status: 'passed',
 *     duration: 150,
 *     suite: ['Authentication', 'Login']
 *   },
 *   {
 *     name: 'should logout successfully',
 *     status: 'passed',
 *     duration: 100,
 *     suite: ['Authentication', 'Logout']
 *   }
 * ]
 *
 * const tree = organizeTestsBySuite(tests)
 *
 * // For structure-only without summary statistics:
 * // const tree = organizeTestsBySuite(tests, { includeSummary: false })
 *
 * // Convert to JSON for machine consumption
 * const treeJson = JSON.stringify(tree, null, 2)
 *
 * console.log(tree.roots[0].name) // 'Authentication'
 * console.log(tree.roots[0].suites.length) // 2 (Login, Logout)
 * ```
 */
export function organizeTestsBySuite(
  tests: Test[],
  options: TreeOptions = {}
): TestTree {
  const { includeSummary = true } = options

  const nodeMap = new Map<string, TreeNode>()
  const rootNodes = new Map<string, TreeNode>()

  const createEmptySummary = (): Summary => ({
    tests: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    pending: 0,
    other: 0,
    flaky: 0,
    start: 0,
    stop: 0,
    duration: 0
  })

  const createTreeTest = (test: Test): TreeTest => ({
    ...test,
    nodeType: 'test',
    id: test.id || crypto.randomUUID()
  })

  const parseSuitePath = (suite: string[] | undefined): string[] => {
    if (!suite) return []
    if (Array.isArray(suite)) {
      return suite.filter(s => s && s.trim().length > 0)
    }
    return []
  }

  const calculateSuiteStatus = (summary: Summary): TestStatus => {
    if (summary.tests === 0) return 'other'
    if (summary.failed > 0) return 'failed'
    if (summary.pending > 0) return 'pending'
    if (summary.skipped === summary.tests) return 'skipped'
    if (summary.passed === summary.tests) return 'passed'
    return 'other'
  }

  const getOrCreateSuite = (path: string[]): TreeNode => {
    const fullPath = path.join('/')

    if (nodeMap.has(fullPath)) {
      return nodeMap.get(fullPath)!
    }

    const name = path[path.length - 1]
    const node: TreeNode = {
      name,
      status: 'other',
      duration: 0,
      tests: [],
      suites: []
    }

    if (includeSummary) {
      node.summary = createEmptySummary()
    }

    nodeMap.set(fullPath, node)

    if (path.length === 1) {
      rootNodes.set(name, node)
    } else {
      const parentPath = path.slice(0, -1)
      const parent = getOrCreateSuite(parentPath)
      parent.suites.push(node)
    }

    return node
  }

  for (const test of tests) {
    const suitePath = parseSuitePath(test.suite)
    const treeTest = createTreeTest(test)

    if (suitePath.length === 0) {
      const testNode: TreeNode = {
        name: treeTest.name,
        status: treeTest.status,
        duration: treeTest.duration,
        tests: [treeTest],
        suites: []
      }

      if (includeSummary) {
        testNode.summary = createEmptySummary()
      }

      rootNodes.set(treeTest.name, testNode)
      nodeMap.set(treeTest.name, testNode)
    } else {
      const parentSuite = getOrCreateSuite(suitePath)
      parentSuite.tests.push(treeTest)
    }
  }

  if (includeSummary) {
    const aggregateStats = (node: TreeNode): void => {
      if (!node.summary) {
        node.summary = createEmptySummary()
      }

      for (const test of node.tests) {
        node.summary.tests++
        node.summary.duration = (node.summary.duration || 0) + test.duration

        if (isTestFlaky(test)) {
          node.summary.flaky = (node.summary.flaky || 0) + 1
        }

        switch (test.status) {
          case 'passed':
            node.summary.passed++
            break
          case 'failed':
            node.summary.failed++
            break
          case 'skipped':
            node.summary.skipped++
            break
          case 'pending':
            node.summary.pending++
            break
          case 'other':
            node.summary.other++
            break
        }
      }

      for (const suite of node.suites) {
        aggregateStats(suite)

        if (suite.summary) {
          node.summary.tests += suite.summary.tests
          node.summary.passed += suite.summary.passed
          node.summary.failed += suite.summary.failed
          node.summary.skipped += suite.summary.skipped
          node.summary.pending += suite.summary.pending
          node.summary.other += suite.summary.other
          node.summary.flaky =
            (node.summary.flaky || 0) + (suite.summary.flaky || 0)
          node.summary.duration =
            (node.summary.duration || 0) + (suite.summary.duration || 0)
        }
      }

      node.duration = node.summary.duration || 0
      node.status = calculateSuiteStatus(node.summary)
    }

    for (const rootNode of rootNodes.values()) {
      aggregateStats(rootNode)
    }
  } else {
    const setDefaultValues = (node: TreeNode): void => {
      node.status = 'other'
      node.duration = 0

      for (const suite of node.suites) {
        setDefaultValues(suite)
      }
    }

    for (const rootNode of rootNodes.values()) {
      setDefaultValues(rootNode)
    }
  }

  if (includeSummary) {
    const overallSummary = createEmptySummary()
    for (const rootNode of rootNodes.values()) {
      if (rootNode.summary) {
        overallSummary.tests += rootNode.summary.tests
        overallSummary.passed += rootNode.summary.passed
        overallSummary.failed += rootNode.summary.failed
        overallSummary.skipped += rootNode.summary.skipped
        overallSummary.pending += rootNode.summary.pending
        overallSummary.other += rootNode.summary.other
        overallSummary.flaky =
          (overallSummary.flaky || 0) + (rootNode.summary.flaky || 0)
        overallSummary.duration =
          (overallSummary.duration || 0) + (rootNode.summary.duration || 0)
      }
    }

    return {
      roots: Array.from(rootNodes.values()),
      summary: overallSummary
    }
  } else {
    return {
      roots: Array.from(rootNodes.values())
    }
  }
}

/**
 * Utility function to traverse the tree and apply a function to each node
 *
 * @param nodes - Array of tree nodes to traverse
 * @param callback - Function to call for each node (suites and tests)
 * @param depth - Current depth in the tree (starts at 0)
 */
export function traverseTree(
  nodes: TreeNode[],
  callback: (
    node: TreeNode | TreeTest,
    depth: number,
    nodeType: 'suite' | 'test'
  ) => void,
  depth: number = 0
): void {
  for (const node of nodes) {
    callback(node, depth, 'suite')

    if (node.suites.length > 0) {
      traverseTree(node.suites, callback, depth + 1)
    }

    for (const test of node.tests) {
      callback(test, depth + 1, 'test')
    }
  }
}

/**
 * Utility function to find a suite by name in the tree
 *
 * @param nodes - Array of tree nodes to search
 * @param name - Name of the suite to find
 * @returns The found suite node or undefined
 */
export function findSuiteByName(
  nodes: TreeNode[],
  name: string
): TreeNode | undefined {
  for (const node of nodes) {
    if (node.name === name) {
      return node
    }

    const found = findSuiteByName(node.suites, name)
    if (found) return found
  }

  return undefined
}

/**
 * Utility function to find a test by name in the tree
 *
 * @param nodes - Array of tree nodes to search
 * @param name - Name of the test to find
 * @returns The found test or undefined
 */
export function findTestByName(
  nodes: TreeNode[],
  name: string
): TreeTest | undefined {
  for (const node of nodes) {
    for (const test of node.tests) {
      if (test.name === name) {
        return test
      }
    }

    const found = findTestByName(node.suites, name)
    if (found) return found
  }

  return undefined
}

/**
 * Utility function to convert tree to a flat array with indentation information
 * Useful for displaying the tree in a linear format
 *
 * @param nodes - Array of tree nodes to flatten
 * @returns Array of objects containing node, depth, and nodeType information
 */
export function flattenTree(nodes: TreeNode[]): Array<{
  node: TreeNode | TreeTest
  depth: number
  nodeType: 'suite' | 'test'
}> {
  const result: Array<{
    node: TreeNode | TreeTest
    depth: number
    nodeType: 'suite' | 'test'
  }> = []

  traverseTree(nodes, (node, depth, nodeType) => {
    result.push({ node, depth, nodeType })
  })

  return result
}

/**
 * Utility function to get all tests from the tree structure as a flat array
 *
 * @param nodes - Array of tree nodes to extract tests from
 * @returns Array of all tests in the tree
 */
export function getAllTests(nodes: TreeNode[]): TreeTest[] {
  const tests: TreeTest[] = []

  traverseTree(nodes, (node, depth, nodeType) => {
    if (nodeType === 'test') {
      tests.push(node as TreeTest)
    }
  })

  return tests
}

/**
 * Utility function to get statistics for a specific suite path
 *
 * @param nodes - Array of tree nodes to search
 * @param suitePath - Array representing the path to the suite
 * @returns Summary statistics for the suite or undefined if not found
 */
export function getSuiteStats(
  nodes: TreeNode[],
  suitePath: string[]
): Summary | undefined {
  let current = nodes

  for (const suiteName of suitePath) {
    const found = current.find(node => node.name === suiteName)
    if (!found) return undefined

    if (suitePath.indexOf(suiteName) === suitePath.length - 1) {
      return found.summary
    }

    current = found.suites
  }

  return undefined
}
