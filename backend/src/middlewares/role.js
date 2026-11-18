// ================================================================
// ROLE MIDDLEWARE
// Fungsi: Memeriksa role user (admin/customer)
// ================================================================

module.exports = (...roles) => {
    return (req, res, next) => {
        // Cek apakah user sudah login (dari auth.js)
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized'
            });
        }

        // Cek apakah role user diizinkan
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Akses ditolak. Anda tidak memiliki izin.'
            });
        }

        next();  // Lanjut ke route berikutnya
    };
};