import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { error: Error | null }

/**
 * Surfaces render crashes instead of a blank outlet (common in Cloud sandbox).
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Claw & Order render error', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="app-error-boundary" role="alert">
        <h1 className="app-error-boundary__title">Something went wrong</h1>
        <p className="app-error-boundary__message">{error.message}</p>
        <button
          type="button"
          className="app-error-boundary__retry"
          onClick={() => this.setState({ error: null })}
        >
          Try again
        </button>
      </div>
    )
  }
}
