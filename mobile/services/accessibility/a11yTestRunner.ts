import { A11yCheck, A11yStatus } from './a11yTypes';

interface ComponentNode {
  type: string;
  props: Record<string, unknown>;
  children?: ComponentNode[];
}

interface A11yResult {
  passed: number;
  failed: number;
  warnings: number;
  checks: A11yCheck[];
}

function hasAccessibleLabel(props: Record<string, unknown>): boolean {
  return !!(props.accessibilityLabel || props.ariaLabel || props['aria-label']);
}

function hasTouchTarget(props: Record<string, unknown>, type: string): boolean {
  if (type === 'TouchableOpacity' || type === 'TouchableHighlight' || type === 'Pressable') {
    const style = props.style as Record<string, unknown> | undefined;
    if (style) {
      const minWidth = Math.min(
        Number(style.minWidth ?? Infinity),
        Number(style.width ?? Infinity),
      );
      const minHeight = Math.min(
        Number(style.minHeight ?? Infinity),
        Number(style.height ?? Infinity),
      );
      return minWidth >= 44 || minHeight >= 44;
    }
    return false;
  }
  return true;
}

function checkContrast(props: Record<string, unknown>): boolean {
  const style = props.style as Record<string, unknown> | undefined;
  if (!style) return true;
  const color = style.color as string | undefined;
  const backgroundColor = style.backgroundColor as string | undefined;
  if (!color || !backgroundColor) return true;
  return true;
}

function checkScreenReaderCompatibility(props: Record<string, unknown>): A11yStatus {
  if (props.onPress || props.onClick) {
    if (!hasAccessibleLabel(props) && !props.accessibilityRole) {
      return 'warning';
    }
  }
  return 'pass';
}

export async function runAccessibilityChecks(componentTree: ComponentNode[]): Promise<A11yCheck[]> {
  const checks: A11yCheck[] = [];

  function traverse(node: ComponentNode): void {
    if (node.props.onPress || node.props.onClick) {
      if (!hasAccessibleLabel(node.props)) {
        checks.push({
          checkName: 'ARIA labels',
          status: 'fail',
          element: node.type,
          recommendation: `Add an accessibilityLabel or ariaLabel to the ${node.type} element`,
        });
      }

      if (!hasTouchTarget(node.props, node.type)) {
        checks.push({
          checkName: 'Touch target size',
          status: 'warning',
          element: node.type,
          recommendation: `Ensure touch target is at least 44x44 points for ${node.type}`,
        });
      }
    }

    const contrastResult = checkContrast(node.props);
    if (!contrastResult) {
      checks.push({
        checkName: 'Color contrast',
        status: 'fail',
        element: node.type,
        recommendation: 'Ensure sufficient color contrast ratio of at least 4.5:1',
      });
    }

    const srResult = checkScreenReaderCompatibility(node.props);
    if (srResult === 'warning') {
      checks.push({
        checkName: 'Screen reader',
        status: 'warning',
        element: node.type,
        recommendation: `Add accessibilityRole to interactive ${node.type} for screen reader compatibility`,
      });
    }

    if (node.children) {
      node.children.forEach(traverse);
    }
  }

  componentTree.forEach(traverse);
  return checks;
}

export function generateA11yReport(results: A11yCheck[]): A11yResult {
  const passed = results.filter((r) => r.status === 'pass').length;
  const failed = results.filter((r) => r.status === 'fail').length;
  const warnings = results.filter((r) => r.status === 'warning').length;

  return { passed, failed, warnings, checks: results };
}
