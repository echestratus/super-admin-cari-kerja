# Git Workflow Rule

## Deskripsi
Aturan ini mewajibkan setiap perubahan kode atau penambahan fitur agar mematuhi standar Git Workflow untuk menjaga kerapian histori repositori.

## Aturan
1. **Selalu Buat Branch Baru**: Sebelum menulis atau mengubah kode, pastikan untuk selalu membuat branch baru dari branch utama (`develop`) menggunakan format yang jelas.
   - Contoh format: `feature/nama-fitur`, `fix/nama-perbaikan`, `chore/nama-task`.
2. **Commit Granular**: Lakukan commit secara berkala (granular) untuk setiap perubahan fungsional yang sudah selesai, bukan satu commit raksasa di akhir.
3. **Conventional Commits**: Penamaan pesan commit harus menggunakan standar Conventional Commits:
   - `feat:` untuk penambahan fitur baru.
   - `fix:` untuk perbaikan bug.
   - `docs:` untuk perubahan pada dokumentasi.
   - `style:` untuk perubahan formatting (spasi, titik koma, dsb) yang tidak mengubah logika kode.
   - `refactor:` untuk perubahan kode yang tidak menambah fitur atau memperbaiki bug.
   - `chore:` untuk pembaruan pada proses build atau alat bantu lainnya.
4. **Tidak Mendorong Langsung ke Develop**: Agen tidak boleh melakukan push langsung ke branch utama (`develop`). Push hanya dilakukan pada branch fitur, kemudian berikan instruksi kepada user (atau buatkan pull request jika diinstruksikan) untuk melakukan merge/review ke branch `develop`.

# Pembagian Tugas Backend & Frontend

## Deskripsi
Aturan ini menetapkan batasan ruang lingkup kerja agen terkait perubahan frontend dan backend. Karena pengguna memiliki agen terpisah untuk menangani frontend dan backend.

## Aturan
1. **Hanya Fokus pada Super Admin**: Agen tidak diperbolehkan mengubah kode atau file apapun yang berada di direktori frontend dan backend. Terhadap direktori `../cari-kerja-frontend` dan `../cari-kerja-backend` (path relatif dari root workspace), agen hanya diberikan akses **Read-Only** (hanya untuk membaca dan memahami konteks), tanpa izin untuk menambah, memodifikasi, atau menghapus file apa pun.
2. **Instruksi terpisah per agen**: Jika fitur membutuhkan penyesuaian di frontend dan/atau backend, keluarkan blok yang **bisa disalin terpisah**:
   - `## Instruksi untuk Agen Backend` — hanya untuk repo `cari-kerja-backend`
   - `## Instruksi untuk Agen Frontend` — hanya untuk repo `cari-kerja-frontend`
   - Jangan gabungkan dalam satu heading "Frontend dan Backend".
   - Jika hanya satu sisi terdampak, hanya keluarkan blok yang relevan.
   - Setiap blok harus mandiri (konteks, perubahan, acceptance) tanpa bergantung pada blok agen lain.
