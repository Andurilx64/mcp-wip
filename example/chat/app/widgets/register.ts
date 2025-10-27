// bridge/chat/chat/app/widgets/register.ts
import { registerWidgets } from '@mcp-wip/react-widget-sdk';

// import OrderForm from './components/OrderForm';

import NewCalendar from './components/NewCalendar2';
import QRScannerWidget from './components/QrScanner2';
import ProductStockWidget from './components/StockVisualizer';
import ImageCarouselWidget from './components/ImageCarousel3';




export const widgets = {
  //'ui://image_carousel': ImageCarousel,
  // 'ui://order_form': OrderForm,
  //'ui://calendar': Calendar,
  'wip://calendar': NewCalendar,
  'wip://qr-code-scanner': QRScannerWidget,
  'wip://stock-level-inspector': ProductStockWidget,
  'wip://image-carousel': ImageCarouselWidget,
};

registerWidgets(widgets);