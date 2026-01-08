# Widget Embed - Quick Reference Card

## 🚀 Copy & Paste

### Minimal (Just Works™)
```html
<script src="https://yourcdn.com/widget.js" 
        data-restaurant-slug="my-restaurant"></script>
```

### Recommended (With Branding)
```html
<script src="https://yourcdn.com/widget.js"
        data-restaurant-slug="my-restaurant"
        data-brand-name="My Restaurant"
        data-primary-color="#667eea"></script>
```

### Full Options
```html
<script src="https://yourcdn.com/widget.js"
        data-restaurant-slug="my-restaurant"
        data-position="bottom-right"
        data-primary-color="#667eea"
        data-brand-name="My Restaurant"
        data-api-url="https://api.example.com"
        data-z-index="9999"></script>
```

---

## ⚙️ Configuration

| Attribute | Values | Default |
|-----------|--------|---------|
| `data-restaurant-slug` | `string` | **Required** |
| `data-position` | `bottom-right`, `bottom-left`, `top-right`, `top-left` | `bottom-right` |
| `data-primary-color` | Hex color (e.g., `#667eea`) | `#667eea` |
| `data-brand-name` | `string` | Uses slug |
| `data-api-url` | URL | `http://localhost:3000` |
| `data-z-index` | `number` | `9999` |

---

## 🎨 Position Examples

```html
<!-- Bottom Right (default) -->
data-position="bottom-right"

<!-- Bottom Left -->
data-position="bottom-left"

<!-- Top Right -->
data-position="top-right"

<!-- Top Left -->
data-position="top-left"
```

---

## 🎯 JavaScript API

### Initialize Manually
```javascript
window.RestaurantWidget.init({
  restaurantSlug: 'my-restaurant',
  position: 'bottom-right',
  primaryColor: '#667eea',
  brandName: 'My Restaurant'
});
```

### Destroy Widget
```javascript
window.RestaurantWidget.destroy('restaurant-widget-my-restaurant');
```

### Check Instances
```javascript
console.log(window.RestaurantWidget.instances);
```

---

## 🔧 Development

### Local Testing
```bash
cd apps/widget
npm run dev
```
Widget runs on `http://localhost:3002`

### Build for Production
```bash
npm run build
```
Output in `dist/widget.js`

### Test Page
Open `test-embed.html` in browser

---

## ✅ Production Checklist

- [ ] Build optimized bundle
- [ ] Upload to CDN
- [ ] Set correct API URL
- [ ] Test on Chrome, Firefox, Safari
- [ ] Test on mobile devices
- [ ] Verify payment flow
- [ ] Set cache headers
- [ ] Enable gzip compression

---

## 🐛 Troubleshooting

**Widget not showing?**
- Check console for errors
- Verify `data-restaurant-slug` is correct
- Ensure API is accessible

**CORS errors?**
- Configure API CORS headers
- Use correct `data-api-url`

**Styling issues?**
- Widget uses Shadow DOM (isolated)
- Check z-index conflicts
- Verify no parent `overflow: hidden`

---

## 📚 Full Documentation

- **[Complete Guide](./EMBED_GUIDE.md)** - Everything you need
- **[Implementation](./IMPLEMENTATION_SUMMARY.md)** - Technical details
- **[Examples](./embed-example.html)** - Visual examples
- **[README](./README.md)** - Project overview

---

## 🎉 That's It!

Your widget is now embeddable with **one line of code** on any website!

**Questions?** Check the full documentation or contact support.
