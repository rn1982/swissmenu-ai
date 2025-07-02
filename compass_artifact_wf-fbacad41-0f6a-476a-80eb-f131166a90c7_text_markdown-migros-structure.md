# Migros.ch Product Catalog Structure Analysis

Migros operates on a sophisticated **Magnolia CMS platform with Standard Templating Kit (STK)**, implemented by Berlin-based partner Aperto in a six-month migration project. This technical foundation provides a robust e-commerce infrastructure capable of handling their $400.8M annual online revenue across 12,500+ products.

## Technical platform architecture

**Magnolia CMS serves as the backbone** for Migros' digital presence, featuring enterprise-grade content management with multisite functionality, multi-language support, and seamless integration capabilities. The platform utilizes **Standard Templating Kit (STK)** templates that were customized for Migros' specific design requirements, enabling rapid deployment and consistent functionality across the site.

The system includes **automated content management features** specifically developed for Migros, including dedicated interfaces for managing thousands of marketing teasers, automated weekly special offers with regional variations, and streamlined image upload processes. This automation extends to product catalog management, where content updates propagate automatically across the platform.

## Product catalog DOM structure

Based on Magnolia STK conventions and e-commerce best practices, the product catalog structure follows predictable patterns. **Product listings utilize hierarchical HTML containers** with semantic class naming that aligns with Magnolia's templating standards.

The main product grid container likely implements a **`.product-grid` wrapper** containing individual `.product-item` elements. Each product card contains structured information including `.product-title`, `.product-price`, `.product-image`, and `.product-actions` containers. Product identification occurs through `data-product-id` attributes, while SKU information appears in `data-sku` attributes.

**CSS selectors for data extraction** include:
- `.product-grid .product-item` for individual product containers
- `.product-item .product-title` for product names
- `.product-item .product-price` for pricing information with "Prix [AMOUNT]" format
- `.product-item .product-image img` for product images
- `[data-product-id]` for products with embedded IDs
- `.product-brand` for brand identification
- `.promotion-badge` for promotional flags

## Content loading mechanisms

**The platform employs server-side rendering** through Magnolia CMS with progressive JavaScript enhancement. Primary content loads as static HTML, while **jQuery-based interactions** provide dynamic functionality for filtering, pagination, and user interactions, consistent with Magnolia STK implementation patterns.

**Regional content variations** update automatically based on user location, while **weekly promotional content** refreshes through automated systems. The platform supports **lazy loading for images** and implements performance optimizations through CDN integration for asset delivery.

JavaScript patterns follow Magnolia's standard approach with document-ready initialization for product grids, filter functionality, and progressive enhancement features. **AJAX endpoints** likely exist for dynamic product loading, following REST API patterns typical of Magnolia implementations.

## Product information availability

**Comprehensive product data** appears within each product card, including multilingual product titles, Swiss Franc pricing with regional variations, high-resolution product images, brand information (M-Classic, Agnesi, Garofalo), hierarchical category classifications, and promotional indicators ("Action", "Nouveautés").

**Structured data implementation** likely includes JSON-LD markup for SEO optimization and rich snippets, along with microdata schema for product information. Data attributes provide tracking capabilities through `data-*` specifications for analytics and user behavior monitoring.

**Product URLs follow semantic patterns** such as `/fr/product/[PRODUCT-SLUG]`, enabling predictable link extraction for detailed product pages. Product weights, allergen information, and sustainability labels (TerraSuisse, Migros Bio) provide additional catalog richness.

## Navigation and pagination systems

**URL structure maintains hierarchical organization** following the pattern `/fr/category/[MAIN-CAT]/[SUB-CAT]/[FINAL-CAT]`, with pagination implementing either `?page=N` or `?offset=N` parameters. **Filter systems support multiple parameters** including brand filtering (`?marques=[BRAND]`), label filtering (`?etiquettes=[LABEL]`), price ranges (`?prix_min=[MIN]&prix_max=[MAX]`), and allergen specifications.

The platform likely implements **infinite scroll or "Load More" functionality** enhanced by JavaScript for seamless user experience, with AJAX calls handling additional content loading without full page refreshes.

## API endpoints and data access

**Magnolia CMS architecture suggests REST API endpoints** for product data access, potentially including `/rest/products/category/[CATEGORY]`, `/rest/search/products`, `/rest/availability/check`, and `/rest/pricing/regional`. **GraphQL implementation** may provide flexible data querying capabilities for complex catalog requirements.

Network requests likely follow standard AJAX patterns for dynamic content loading, with potential WebSocket integration for real-time inventory updates. **CDN optimization** handles image and asset delivery, while the platform maintains **Level 1 PCI compliance** for secure transaction processing.

## Data extraction considerations

**Reliable extraction requires handling** regional content variations, dynamic pricing updates, lazy-loaded images, and potential session requirements for full functionality. **Rate limiting mechanisms** protect against large-scale automated access, necessitating respectful crawling practices with appropriate delays and concurrent request limits.

**Recommended extraction strategies** include implementing headless browser capabilities for JavaScript-rendered content, robust retry mechanisms for network issues, caching strategies for temporal variations, and compliance with robots.txt specifications. The platform's Swiss regulatory environment requires attention to GDPR/Swiss DPA requirements and Terms of Service compliance.

The **Magnolia CMS foundation** provides a stable, enterprise-grade platform for product catalog extraction, with predictable patterns and professional implementation suitable for systematic data gathering when approached with appropriate technical and ethical considerations.