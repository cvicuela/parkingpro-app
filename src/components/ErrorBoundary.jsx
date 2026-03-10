import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error(`[ErrorBoundary] Error en ${this.props.pageName || 'componente'}:`, error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle size={32} className="text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            Error en {this.props.pageName || 'esta sección'}
          </h2>
          <p className="text-gray-500 mb-4 max-w-md">
            Ocurrió un error inesperado. Puedes intentar recargar esta sección o contactar al administrador si el problema persiste.
          </p>
          {this.state.error && (
            <details className="mb-4 text-left bg-gray-50 rounded-lg p-4 max-w-lg w-full">
              <summary className="text-sm text-gray-600 cursor-pointer font-medium">
                Detalles del error
              </summary>
              <pre className="mt-2 text-xs text-red-600 overflow-auto max-h-40">
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
          <button
            onClick={this.handleRetry}
            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <RefreshCw size={16} /> Reintentar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
