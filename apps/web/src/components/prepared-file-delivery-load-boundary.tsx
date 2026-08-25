import { Component, createRef, type ReactNode } from "react";

export interface PreparedFileDeliveryLoadBoundaryProps {
  children: ReactNode;
  onClose(): void;
}

interface PreparedFileDeliveryLoadBoundaryState {
  failed: boolean;
}

export class PreparedFileDeliveryLoadBoundary extends Component<
  PreparedFileDeliveryLoadBoundaryProps,
  PreparedFileDeliveryLoadBoundaryState
> {
  state: PreparedFileDeliveryLoadBoundaryState = { failed: false };
  private readonly alertRef = createRef<HTMLDivElement>();
  private focusFrame: number | null = null;

  static getDerivedStateFromError(): PreparedFileDeliveryLoadBoundaryState {
    return { failed: true };
  }

  componentDidCatch(): void {
    this.focusFrame = requestAnimationFrame(() => this.alertRef.current?.focus());
  }

  componentWillUnmount(): void {
    if (this.focusFrame !== null) cancelAnimationFrame(this.focusFrame);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div
        ref={this.alertRef}
        className="bazi-applicability-comparison__error"
        role="alert"
        tabIndex={-1}
      >
        <p>
          <strong>本机交付界面已中断。</strong>{" "}
          此边界无法确认中断前的交付状态，请核对本机文件与回执；可清除页面会话工件后刷新页面重试。清除只移除页面可达引用，不证明物理内存擦除、文件删除或旧副本召回。
        </p>
        <button type="button" className="button secondary" onClick={this.props.onClose}>
          清除页面会话工件
        </button>
      </div>
    );
  }
}
