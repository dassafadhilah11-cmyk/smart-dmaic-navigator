# Smart DMAIC Guide

Create a fully functional, highly interactive single-page Web Application named "Smart DMAIC Project Companion". The design must look incredibly professional, using a clean Light Blue and White color scheme with dark slate text for perfect readability.

Core Features to Implement:

1. Main Input Dashboard:

   - A modern header with the application title.

   - A large text area where the user inputs their specific business or operational problem (e.g., "Angka kecacatan produk keripik singkong meningkat").

   - A prominent "Generate DMAIC Roadmap" button.

2. Dynamic LSS AI Brain (Crucial for Lovable):

   - When the user clicks "Generate", the app must use an internal LLM simulation or conditional logic to dynamically generate contextual data tailored specifically to the user's input problem. 

   - The output must NOT be hardcoded or blank. It must actively read what the user typed and distribute relevant Lean Six Sigma insights across 5 interactive tabs.

3. Interactive DMAIC Tabs (Define, Measure, Analyze, Improve, Control):

   - DEFINE Tab: Display a dynamic "Project Charter" containing a custom Problem Statement (exactly what the user typed), a calculated Goal Statement (e.g., reduce the specific defect by 50%), and a basic project timeline.

   - MEASURE Tab: Generate a specific Data Collection Plan and a checklist of Critical-to-Quality (CTQ) questions based on the user's problem context.

   - ANALYZE Tab: Suggest specific Root Cause Analysis tools. Separate them into Qualitative (like Fishbone 5M+1E, 5 Whys) and Quantitative/Statistical tools (like Pareto Chart, Control Charts) that match the problem type.

   - IMPROVE Tab: Create a dynamic Action Plan / Kaizen table with customized "Potential Failure modes" and "Recommended Solutions" (e.g., if the user mentions food/temperature, suggest sensor automation; if they mention delays, suggest layout optimization).

   - CONTROL Tab: Provide tailored suggestions for Mistake-Proofing (Poka-Yoke) and an SPC monitoring plan to sustain the improvements.

4. UX Enhancements:

   - Include an "Export to PDF / Print" button at the bottom.

   - Ensure the tab switching animation is smooth and responsive.
                            




                        


                        


                            Goal Statement
                            

Menurunkan tingkat kecacatan/pemborosan sebesar 50% dalam waktu 3 bulan ke depan.


                        


                    


                



                


                    


                        

📊 Data Collection Plan (Measure)


                        

Mengukur performa proses saat ini sebelum melakukan perbaikan.


                    


                    


                        Pertanyaan Kunci Pengumpulan Data (CTQ):
                        


                            

Berapa jumlah produk cacat per *batch* produksi?


                            

Kapan waktu terjadinya kecacatan tertinggi (Shift pagi/malam)?


                            

Apakah jenis cacatnya dominan gosong, hancur, atau ukuran tidak seragam?


                        


                    


                



                


                    


                        

🔍 Root Cause Analysis Tools


                        

Rekomendasi alat analisis statistik untuk mencari akar penyebab masalah.


                    


                    


                        


                            

Alat Kualitatif (Penyebab Dasar):


                            


                                

**Fishbone Diagram (5M+1E):** Cek Man, Machine, Method, Material, Measurement, Environment.


                                

**5 Whys:** Telusuri penyebab hingga ke akar terdalam.


                            


                        


                        


                            

Alat Kuantitatif / Statistik:


                            


                                

**Pareto Chart:** Untuk memprioritaskan 20% jenis cacat utama.


                                

**Control Chart (P-Chart):** Untuk memantau proporsi kecacatan produk.


                            


                        


                    


                



                


                    


                        

💡 Kaizen & Action Plan


                        

Menyusun strategi solusi perbaikan.


                    


                    

Berdasarkan pola masalah, berikut rekomendasi tindakan perbaikan:


                    


                        


                            
                                
                                    Potensi Kegagalan
                                    Solusi Perbaikan
                                    Metode
                                
                            
                            
                                
                                    Suhu mesin tidak stabil
                                    Pasang sensor otomatis temperatur
                                    Poka-Yoke
                                
                                
                                    Operator kurang teliti
                                    Pelatihan & Standardisasi SOP baru
                                    Training
                                
                            
                        


                    


                



                


                    


                        

🛡️ Control & Monitoring Plan


                        

Mengunci perbaikan agar kualitas tetap terjaga dalam jangka panjang.


                    


                    


                        

Implementasi **Standard Operating Procedure (SOP)** yang telah diperbarui.

Membuat **Control Chart harian** yang diisi oleh operator di lapangan untuk memantau kecacatan produk secara *real-time*.


                    


                



            



            
                🖨️ Cetak / Simpan Jadi PDF
            
        



    

    


                            


                        


                        


                            

Alat Kuantitatif / Statistik:


                            


                                

**Pareto Chart:** Untuk memprioritaskan 20% jenis cacat utama.


                                

**Control Chart (P-Chart):** Untuk memantau proporsi kecacatan produk.


                            


                        


                    


                



                


                    


                        

💡 Kaizen & Action Plan


                        

Menyusun strategi solusi perbaikan.


                    


                    

Berdasarkan pola masalah, berikut rekomendasi tindakan perbaikan:


                    


                        


                            
                                
                                    Potensi Kegagalan
                                    Solusi Perbaikan
                                    Metode
                                
                            
                            
                                
                                    Suhu mesin tidak stabil
                                    Pasang sensor otomatis temperatur
                                    Poka-Yoke
                                
                                
                                    Operator kurang teliti
                                    Pelatihan & Standardisasi SOP baru
                                    Training
                                
                            
                        


                    


                



                


                    


                        

🛡️ Control & Monitoring Plan


                        

Mengunci perbaikan agar kualitas tetap terjaga dalam jangka panjang.


                    


                    


                        

Implementasi **Standard Operating Procedure (SOP)** yang telah diperbarui.

Membuat **Control Chart harian** yang diisi oleh operator di lapangan untuk memantau kecacatan produk secara *real-time*.


                    


                



            



            
                🖨️ Cetak / Simpan Jadi PDF

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://smart-dmaic-navigator.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/8c92b154-0026-4fa4-a917-e6c2fa9688a5).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
