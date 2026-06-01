import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useT } from '../i18n/LanguageContext';
import usePageMeta from '../hooks/usePageMeta';
import { useUsage } from '../usage/UsageContext';
import { useAuth } from '../auth/AuthContext';
import { api } from '../utils/api';
import '../cmr.css';

/**
 * CMR — International Consignment Note.
 * Faithful, fillable reproduction of cmr.pdf. The layout, wording, line
 * structure and blue ink are kept identical to the source document; only the
 * empty fields become editable inputs. "Print / PDF" uses the browser's native
 * print dialog so the printed sheet matches the on-screen form 1:1.
 */
const CmrDocument = () => {
    const navigate = useNavigate();
    const { t } = useT();
    const { guard } = useUsage();
    const { user } = useAuth();
    usePageMeta({
        title: 'CMR Note — Fillable International Consignment Note Template | LDMCalculator',
        description: 'Free fillable CMR (International Consignment Note) template. Fill in sender, consignee, carrier and goods details and print or save as PDF.',
        canonical: 'https://ldmcalculator.com/tools/cmr'
    });

    const [f, setF] = useState({
        no: 'NO 02030',
        place3: 'İSTANBUL / TÜRKİYE'
    });
    const set = (k) => (e) => setF(prev => ({ ...prev, [k]: e.target.value }));
    const val = (k) => f[k] ?? '';

    // Reset asks for confirmation first so a full form isn't wiped by accident.
    const handleReset = () => {
        if (window.confirm(t('tools.resetConfirm'))) {
            setF({ no: 'NO 02030', place3: 'İSTANBUL / TÜRKİYE' });
        }
    };

    // Printing/saving a CMR counts as one tool use against the free-tier quota.
    const handlePrint = async () => {
        const allowed = await guard('tool', 'cmr');
        if (!allowed) return;
        // Logged-in users get the document saved to their panel for re-download.
        if (user) {
            api('/api/account/documents', {
                method: 'POST',
                body: { type: 'cmr', title: `CMR ${f.no || ''}`.trim(), data: f },
            }).catch(() => {});
        }
        window.print();
    };

    const ta = (k, rows = 3) => (
        <textarea className="cmr-textarea" rows={rows} value={val(k)} onChange={set(k)} />
    );

    // 6 empty goods rows
    const goodsRows = Array.from({ length: 6 });

    return (
        <div className="cmr-page">
            <div className="cmr-toolbar">
                <div className="cmr-tb-left">
                    <img
                        src="/src/ldm-calculator-beyaz-logo.png"
                        alt="LDM"
                        onClick={() => navigate('/')}
                        style={{ width: 150, cursor: 'pointer' }}
                    />
                    <strong style={{ color: '#e2e8f0' }}>{t('tools.cmr')}</strong>
                </div>
                <div className="cmr-tb-actions">
                    <button className="cmr-btn" onClick={() => navigate('/')}>{t('tools.back')}</button>
                    <button className="cmr-btn" onClick={handleReset}>{t('tools.reset')}</button>
                    <button className="cmr-btn cmr-btn-primary" onClick={handlePrint}>{t('tools.print')}</button>
                </div>
            </div>

            <div className="cmr-sheet">
                <div className="cmr-frame">
                    {/* ===== LEFT VERTICAL LEGEND STRIP ===== */}
                    <div className="cmr-vstrip">
                        <span>ZE: The spaces formed with heavy lines must be filled in by the carrier — Kalın çerçeve içinde kalan yerler taşıyıcı tarafından doldurulacak</span>
                        <span>19 – 21 - 22</span>
                        <span>Including and / Ve&nbsp;&nbsp;&nbsp;1 – 15</span>
                        <span>To be Completed on the senders responsability — Gönderenin nezaretinde doldurulmuştur</span>
                    </div>

                    {/* ===== BODY ===== */}
                    <div className="cmr-body">
                        {/* ===== TOP REGION ===== */}
                        <div className="cmr-row">
                            {/* LEFT COLUMN */}
                            <div className="cmr-col" style={{ flex: '0 0 47%' }}>
                                <div className="cmr-cell" style={{ minHeight: 78 }}>
                                    <div className="cmr-label"><span className="num">1</span> Sender (Name, address, country)<br /><span className="tr">Gönderen (İsim, adres, ülke)</span></div>
                                    {ta('sender', 4)}
                                </div>
                                <div className="cmr-cell" style={{ minHeight: 78 }}>
                                    <div className="cmr-label"><span className="num">2</span> Consignee (Name, address, country)<br /><span className="tr">Alacak olan (İsim, adres, ülke)</span></div>
                                    {ta('consignee', 4)}
                                </div>
                                <div className="cmr-cell" style={{ minHeight: 52 }}>
                                    <div className="cmr-label"><span className="num">3</span> Place and Date of taking over the goods (Place, country)<br /><span className="tr">Malın/Malların Teslim alındığı yer (Mahal, Ülke, Tarih)</span></div>
                                    {ta('place3', 2)}
                                </div>
                                <div className="cmr-cell" style={{ minHeight: 52 }}>
                                    <div className="cmr-label"><span className="num">4</span> Place and Date of delivery of the goods (Place, country)<br /><span className="tr">Malın/Malların Teslim yeri (Mahal, Ülke, Tarih)</span></div>
                                    {ta('place4', 2)}
                                </div>
                                <div className="cmr-cell" style={{ minHeight: 60 }}>
                                    <div className="cmr-label"><span className="num">5</span> Documents attached<br /><span className="tr">Ekli Belgeler</span></div>
                                    {ta('documents', 3)}
                                </div>
                            </div>

                            {/* RIGHT COLUMN */}
                            <div className="cmr-col" style={{ flex: '1 1 53%' }}>
                                {/* Title + NO box */}
                                <div className="cmr-row">
                                    <div className="cmr-cell" style={{ flex: '1 1 64%' }}>
                                        <div className="cmr-title">
                                            INTERNATIONAL CONSIGNMENT NOTE<br />
                                            ULUSLAR ARASI HAMULE SENEDİ<br />
                                            TRUCK BILL OF LOADING
                                        </div>
                                        <div className="cmr-conv">
                                            This carriage is subject, notwithstanding any clause to the contrary, to the convention on the contract for the International Carriage of Goods by road (CMR).
                                        </div>
                                    </div>
                                    <div className="cmr-col" style={{ flex: '1 1 36%' }}>
                                        <div className="cmr-cell" style={{ minHeight: 16 }}>
                                            <div className="cmr-label">Carriers nb. Code Transporteur. Pozisyon noe.</div>
                                        </div>
                                        <div className="cmr-cell cmr-heavy" style={{ minHeight: 30 }}>
                                            <input className="cmr-input cmr-no-box" value={val('no')} onChange={set('no')} />
                                        </div>
                                        <div className="cmr-cell" style={{ minHeight: 44 }}>
                                            <div className="cmr-conv">
                                                Bu taşıma, burada belirtilenin aksine hiçbir şarta bırakılmaksızın karayolu ile Uluslararası mal Nakliyatı ile ilgili anlaşma (CMR) hükümlerine tabidir.
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="cmr-cell" style={{ minHeight: 80 }}>
                                    <div className="cmr-label"><span className="num">16</span> Carrier (Name, address, country)<br /><span className="tr">Taşıyıcı Firma (İsim, adres, ülke)</span></div>
                                    {ta('carrier', 4)}
                                </div>
                                <div className="cmr-cell" style={{ minHeight: 60 }}>
                                    <div className="cmr-label"><span className="num">17</span> Successive carriers (Name, address, country)<br /><span className="tr">Müteakip/İkinci Taşıyıcı (İsim, adres, ülke)</span></div>
                                    {ta('succCarrier', 3)}
                                </div>
                                <div className="cmr-cell" style={{ minHeight: 74 }}>
                                    <div className="cmr-label"><span className="num">18</span> Carriers reservations and observations<br /><span className="tr">Taşıyıcının mülahazat ve müşahadeleri</span> &nbsp;&nbsp; <b>19 – 21 - 22</b></div>
                                    {ta('reservations', 2)}
                                    <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                                        <div style={{ flex: 1 }}>
                                            <div className="cmr-label">Carnet Tır No:</div>
                                            <input className="cmr-input" value={val('carnet')} onChange={set('carnet')} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div className="cmr-label">Plate Nb. / Çekici Plaka No:</div>
                                            <input className="cmr-input" value={val('plate')} onChange={set('plate')} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ===== GOODS TABLE ===== */}
                        <div style={{ position: 'relative' }}>
                            <table className="cmr-goods">
                                <thead>
                                    <tr>
                                        <th style={{ width: '15%' }}><span className="num">6</span> Marks and No<br />Marka ve No</th>
                                        <th style={{ width: '11%' }}><span className="num">7</span> Number of Packages<br />Koli/Paket adedi</th>
                                        <th style={{ width: '13%' }}><span className="num">8</span> Method of Packing<br />Ambalaj Şekli</th>
                                        <th style={{ width: '24%' }}><span className="num">9</span> Nature of the goods<br />Malın mahiyeti</th>
                                        <th style={{ width: '13%' }}><span className="num">10</span> Statistical Number<br />İstatistik Numarası</th>
                                        <th style={{ width: '12%' }}><span className="num">11</span> Gross weight kg<br />KG Brüt Ağırlık</th>
                                        <th style={{ width: '12%' }}><span className="num">12</span> Net Weight kg<br />KG Net Ağırlık</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {goodsRows.map((_, i) => (
                                        <tr key={i}>
                                            {['marks', 'packs', 'packing', 'nature', 'stat', 'gross', 'net'].map(c => (
                                                <td key={c}>
                                                    <input className="cell-input" value={val(`g_${c}_${i}`)} onChange={set(`g_${c}_${i}`)} />
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="cmr-watermark">CMR</div>
                        </div>

                        {/* ===== BOTTOM REGION ===== */}
                        <div className="cmr-row">
                            {/* LEFT */}
                            <div className="cmr-col" style={{ flex: '0 0 47%' }}>
                                {/* ADR header */}
                                <div className="cmr-row">
                                    <div className="cmr-cell" style={{ flex: 1 }}>
                                        <div className="cmr-label">Class<br />Klas</div>
                                        <input className="cmr-input" value={val('adrClass')} onChange={set('adrClass')} />
                                    </div>
                                    <div className="cmr-cell" style={{ flex: 1 }}>
                                        <div className="cmr-label">Number<br />Numara</div>
                                        <input className="cmr-input" value={val('adrNumber')} onChange={set('adrNumber')} />
                                    </div>
                                    <div className="cmr-cell" style={{ flex: 1 }}>
                                        <div className="cmr-label">Letter (ADR)<br />Harf (ADR)</div>
                                        <input className="cmr-input" value={val('adrLetter')} onChange={set('adrLetter')} />
                                    </div>
                                </div>
                                <div className="cmr-cell" style={{ minHeight: 70 }}>
                                    <div className="cmr-label"><span className="num">13</span> Senders Instructions<br /><span className="tr">Gönderenin talimatı</span></div>
                                    <div className="cmr-conv">
                                        Yükleme, İstifleme ve Ambalaj hatasından doğacak zarar yükleyiciye aittir. Yükleme ve Boşaltmada serbest süre 48 saattir. 48 Saat geçtikten sonra günlük 200 Euro Bekleme alınır.
                                    </div>
                                    {ta('sendersInstr', 2)}
                                </div>
                                <div className="cmr-cell" style={{ minHeight: 48 }}>
                                    <div className="cmr-label"><span className="num">14</span> Instruction as to payment for carriage<br /><span className="tr">Navlunun ödeme şekli</span></div>
                                    <label className="cmr-check"><input type="checkbox" checked={!!f.franco} onChange={e => setF(p => ({ ...p, franco: e.target.checked }))} /> Franco / Yükleme Peşin</label>
                                    <label className="cmr-check"><input type="checkbox" checked={!!f.nonFranco} onChange={e => setF(p => ({ ...p, nonFranco: e.target.checked }))} /> Non Franko / Teslimde Peşin</label>
                                </div>
                                <div className="cmr-cell" style={{ minHeight: 40 }}>
                                    <div className="cmr-label"><span className="num">21</span> Established in<br /><span className="tr">Tanzim Yeri</span></div>
                                    {ta('establishedIn', 1)}
                                </div>
                                <div className="cmr-cell cmr-heavy" style={{ minHeight: 48 }}>
                                    <div className="cmr-label"><span className="num">15</span> Reimbursement / Cash on delivery<br /><span className="tr">Teslimatta ödenecek meblağ</span></div>
                                    {ta('reimbursement', 2)}
                                </div>
                            </div>

                            {/* RIGHT */}
                            <div className="cmr-col" style={{ flex: '1 1 53%' }}>
                                <div className="cmr-cell" style={{ minHeight: 64 }}>
                                    <div className="cmr-label"><span className="num">19</span> Special Terms<br /><span className="tr">Özel Şartlar/Anlaşma</span></div>
                                    <div className="cmr-conv">
                                        Shippers are responsible for any damages and/or losses due to improper loading and/or packing. Demurrage at 200 Euro per day shall be payable exceeding 48 hours loading and/or discharging time.
                                    </div>
                                    {ta('specialTerms', 1)}
                                </div>
                                {/* 20 payment table */}
                                <div className="cmr-cell cmr-heavy" style={{ padding: 0 }}>
                                    <table className="cmr-pay">
                                        <thead>
                                            <tr>
                                                <th style={{ textAlign: 'left', width: '40%' }}><span className="num">20</span> To be paid by<br />Ödeyecek</th>
                                                <th style={{ width: '20%' }}>Senders<br />Gönderen</th>
                                                <th style={{ width: '20%' }}>Currency<br />Para cinsi</th>
                                                <th style={{ width: '20%' }}>Consignee<br />Alacak olan</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {[
                                                ['carriage', 'Carriage charges: / Navlun Tutarı:'],
                                                ['deductions', 'Deductions: / İskonto/Tenzilat:'],
                                                ['balance', 'Balance: / Bakiye:'],
                                                ['supplem', 'Supplem. charges: / Munzam Masraflar:'],
                                                ['other', 'Other Charges: / Diğer Masraflar:'],
                                            ].map(([k, label]) => (
                                                <tr key={k}>
                                                    <td className="lbl">{label}</td>
                                                    <td><input className="pay-input" value={val(`pay_${k}_s`)} onChange={set(`pay_${k}_s`)} /></td>
                                                    <td><input className="pay-input" value={val(`pay_${k}_cur`)} onChange={set(`pay_${k}_cur`)} /></td>
                                                    <td><input className="pay-input" value={val(`pay_${k}_co`)} onChange={set(`pay_${k}_co`)} /></td>
                                                </tr>
                                            ))}
                                            <tr>
                                                <td className="lbl"><b>TOTAL / TOPLAM</b></td>
                                                <td><input className="pay-input" value={val('pay_total_s')} onChange={set('pay_total_s')} /></td>
                                                <td><input className="pay-input" value={val('pay_total_cur')} onChange={set('pay_total_cur')} /></td>
                                                <td><input className="pay-input" value={val('pay_total_co')} onChange={set('pay_total_co')} /></td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* ===== SIGNATURES ===== */}
                        <div className="cmr-row">
                            <div className="cmr-cell cmr-sign" style={{ flex: 1 }}>
                                <div className="cmr-label"><span className="num">22</span></div>
                                <div className="cap">Signature and stamp of the sender<br /><span className="tr">Gönderenin imzası ve kaşesi</span></div>
                            </div>
                            <div className="cmr-cell cmr-sign" style={{ flex: 1 }}>
                                <div className="cmr-label"><span className="num">23</span></div>
                                <div className="cap">Signature and stamp of the carrier<br /><span className="tr">Taşıyıcının imzası ve kaşesi</span></div>
                            </div>
                            <div className="cmr-cell cmr-sign" style={{ flex: 1 }}>
                                <div className="cmr-label"><span className="num">24</span> Good Received / Alınan Yük</div>
                                <div className="cap">Signature and stamp of the consignee<br /><span className="tr">Alıcının imza ve kaşesi</span></div>
                            </div>
                        </div>
                    </div>

                    {/* ===== RIGHT VERTICAL LEGEND STRIP ===== */}
                    <div className="cmr-vstrip right">
                        <span>In case dangerous goods mentioned besides the possible certification, on the last of the column the particulars of the class, the number and the letter, if any.</span>
                        <span>Tehlikeli malın taşınması halinde, mal spesifikasyonu ile ilgili tüm bilgiyi 6,7,8,9. hanelerin oluşturduğu çerçevenin en alt satırında belirtin.</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CmrDocument;
