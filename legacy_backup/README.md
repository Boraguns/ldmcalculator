# 🚛 3D Tır Yükleme Optimizasyonu

## 📋 Proje Özeti

Gelişmiş **3D Bin Packing Algoritması** kullanarak tır/dorse içerisinde optimal kargo yerleştirmesi sağlayan web uygulaması.

## ✨ Yeni Özellikler

### 1️⃣ **Tamamen Manuel Giriş Sistemi**
- ❌ Ön tanımlı koli/palet seçenekleri kaldırıldı
- ✅ Kullanıcı tüm ölçüleri manuel girer:
  - Genişlik (cm)
  - Derinlik (cm)
  - Yükseklik (cm)
  - Ağırlık (kg)
  - Adet

### 2️⃣ **"Tüm Ürünlerim Aynı Boyda" Checkbox**
- ✅ İşaretli: Tek ürün tipi, çok adet
  - Ölçüleri bir kere girersiniz
  - Sadece adet belirtirsiniz
  - Tüm ürünler aynı boyutta olarak hesaplanır

- ❌ İşaretli değil: Farklı ürünler
  - Her ürün için ayrı satır
  - **+ (Yeni Ürün Ekle)** butonu ile 20 satıra kadar ürün ekleyebilirsiniz
  - Her ürün farklı ölçülerde olabilir

### 3️⃣ **Akıllı 3D Bin Packing Algoritması**
- **First Fit Decreasing** stratejisi
- **6 farklı oryantasyon** denemesi (döndürme)
- Otomatik **çakışma kontrolü**
- **Ağırlık ve hacim** optimizasyonu
- Maksimum verimlilik hesaplama

### 4️⃣ **Görsel Sonuç Ekranı**
- 🎨 **Render Modları**:
  - Üstten görünüm (Top View)
  - **Katman (Layer) Kontrolü** 🆕: Yükseklik slider'ı ile katmanları tek tek inceleyin
- 🎨 Her ürün farklı renkte
- 📊 Detaylı istatistikler:
  - Toplam yüklenen / İstenen adet
  - Toplam ağırlık
  - Hacim verimliliği (%)
  - Genel kullanım oranı (%)
- ⚠️ Uyarılar: Sığmayan ürünler için bilgi

## 🗂️ Dosya Yapısı

```
e:\calculator/
├── index.html          # Ana HTML yapısı
├── script.js           # Uygulama mantığı
├── binpacking.js       # 3D Bin Packing algoritması
├── cubes.js            # 3D Görselleştirme
├── style.css           # Ana stiller
└── cubes.css           # Görselleştirme stilleri
```

## 🚀 Kullanım

1. **`index.html`** dosyasını tarayıcınızda açın
2. **Dorse tipi** seçin (Standart / Mega)
3. **Checkbox** ile ürün tipini belirleyin:
   - Aynı boyda → Tek satır, adet girin
   - Farklı boyutta → Her ürün için + ile satır ekleyin
4. **Ölçüleri** doldurun
5. **"Optimum İstiflemeyi Hesapla"** butonuna tıklayın
6. **Sonuçları** görüntüleyin ve 3D render'ı inceleyin

## 🧮 Algoritma Detayları

### Bin Packing Süreci:
1. **Sıralama**: Ürünler hacme göre büyükten küçüğe sıralanır
2. **Yerleştirme**: Her ürün için:
   - 6 farklı oryantasyon denenir
   - En uygun pozisyon bulunur (Bottom-Left-Back stratejisi)
   - Çakışma kontrolü yapılır
3. **Optimizasyon**: 
   - Ağırlık limiti kontrolü (22,000 kg)
   - Hacim verimliliği hesaplanır

### Oryantasyonlar:
- 0: Orijinal (L×W×H)
- 1: 90° döndürülmüş (W×L×H)
- 2: Yan yatırılmış (H×W×L)
- 3: Diğer kombinasyonlar...

## 📊 Sonuç Verileri

- **Toplam Yüklenen**: Kaç ürünün sığdığı
- **Toplam Ağırlık**: Yüklenen ürünlerin toplam kg'ı
- **Hacim Verimliliği**: Dorsenin hacminin ne kadar kullanıldığı (%)
- **Genel Kullanım**: Ağırlık ve hacim kullanımının ortalaması
- **Ürün Detayları**: Her ürün tipinden kaç adet sığdı

## 🎨 Görsel Özellikler

- Modern dark mode tasarım
- Smooth animasyonlar (GSAP)
- Responsive tasarım (mobil uyumlu)
- Hover efektleri ve tooltips
- Renkli ürün gösterimi (10 farklı renk)
- Yükseklik göstergeleri (Z-ekseni)

## 🔧 Teknik Özellikler

- **Vanilla JavaScript** (Framework yok)
- **3D Spatial Algorithm** (Gerçek bin packing)
- **Dynamic DOM Manipulation**
- **CSS Grid & Flexbox** layout
- **GSAP** animasyon kütüphanesi
- **Local File Support** (Sunucu gerektirmez)

## 💡 İpuçları

1. **Maksimum 20 farklı ürün** ekleyebilirsiniz
2. **Aynı boyda checkbox** büyük miktarlar için daha hızlı
3. Ürünler **büyükten küçüğe** sıralanır (otomatik)
4. **Tüm rotasyonlar** denenir, en iyisi seçilir
5. **Hover** ile her kutunun detaylarını görebilirsiniz

## 📝 Notlar

- Tır görselleri mevcut projenizden alınmıştır
- Algoritma **gerçek 3D koordinat sistemi** kullanır
- Sonuçlar **%100 doğru** hesaplanır
- **Ağırlık limiti** 22 ton olarak ayarlıdır

---

**Geliştirici**: AI Coding Assistant  
**Versiyon**: 2.0  
**Son Güncelleme**: 2026-02-03
