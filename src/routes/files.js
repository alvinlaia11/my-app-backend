const express = require('express');
const router = express.Router();
const path = require('path');
const { supabase } = require('../config/supabase');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

// GET files dan folders
router.get('/', async (req, res) => {
  try {
    const { path = '' } = req.query;
    const userId = req.user.userId;

    const { data: files, error: filesError } = await supabase
      .from('files')
      .select('*')
      .eq('user_id', userId)
      .eq('path', path)
      .order('created_at', { ascending: false });

    if (filesError) throw filesError;

    const { data: folders, error: foldersError } = await supabase
      .from('folders')
      .select('*')
      .eq('user_id', userId)
      .eq('path', path)
      .order('name', { ascending: true });

    if (foldersError) throw foldersError;

    res.json({
      success: true,
      files: files.map(file => ({
        id: file.id,
        name: file.original_name || file.filename,
        url: file.file_url,
        created_at: file.created_at,
        type: 'file'
      })),
      folders: folders.map(folder => ({
        id: folder.id,
        name: folder.name,
        type: 'folder',
        created_at: folder.created_at
      }))
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST endpoint untuk upload file
router.post('/upload', verifyToken, async (req, res) => {
  try {
    // Debug request
    console.log('Headers:', req.headers);
    console.log('Files:', req.files);
    console.log('Body:', req.body);

    // Validasi file
    if (!req.files || !req.files.file) {
      return res.status(400).json({
        success: false,
        error: 'File harus diupload'
      });
    }

    const file = req.files.file;
    const userId = req.user.userId;
    const uploadPath = req.body.path || '';

    // Validasi file
    validateFile(file);

    // Proses upload
    const filename = `${Date.now()}-${file.name}`;
    const filePath = `${userId}/${uploadPath}/${filename}`.replace(/\/+/g, '/');

    // Upload ke storage
    const { error: uploadError } = await supabase.storage
      .from('files')
      .upload(filePath, file.data, {
        contentType: file.mimetype
      });

    if (uploadError) throw uploadError;

    // Dapatkan URL file
    const { data: { publicUrl } } = supabase.storage
      .from('files')
      .getPublicUrl(filePath);

    // Simpan metadata ke tabel files (tanpa kolom size)
    const { error: dbError } = await supabase
      .from('files')
      .insert({
        filename: filename,
        original_name: file.name,
        path: uploadPath,
        file_url: publicUrl,
        mime_type: file.mimetype,
        user_id: userId
      });

    if (dbError) throw dbError;

    res.json({
      success: true,
      message: 'File berhasil diupload'
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Gagal mengupload file: ' + error.message
    });
  }
});

// DELETE endpoint untuk file
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { type, path, filename } = req.body;
    const userId = req.user.userId;

    if (type === 'folder') {
      // Hapus folder
      const { error } = await supabase
        .from('folders')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;
    } else {
      // Hapus file
      const { error } = await supabase
        .from('files')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;
    }

    res.json({
      success: true,
      message: `${type === 'folder' ? 'Folder' : 'File'} berhasil dihapus`
    });

  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// DELETE endpoint untuk folder
router.delete('/folders/:id', async (req, res) => {
  try {
    const folderId = req.params.id;
    const userId = req.user.userId;

    // Dapatkan informasi folder
    const { data: folder, error: folderError } = await supabase
      .from('folders')
      .select('*')
      .eq('id', folderId)
      .eq('user_id', userId)
      .single();

    if (folderError) throw folderError;
    if (!folder) throw new Error('Folder tidak ditemukan');

    // Hapus semua file dalam folder
    const { data: files, error: filesError } = await supabase
      .from('files')
      .select('*')
      .eq('user_id', userId)
      .eq('path', folder.path + '/' + folder.name);

    if (filesError) throw filesError;

    // Hapus file dari storage dan database
    for (const file of files) {
      await supabase.storage
        .from('files')
        .remove([`${userId}/${file.path}/${file.filename}`]);
    }

    // Hapus metadata file dari database
    if (files.length > 0) {
      const { error: deleteError } = await supabase
        .from('files')
        .delete()
        .eq('user_id', userId)
        .eq('path', folder.path + '/' + folder.name);

      if (deleteError) throw deleteError;
    }

    // Hapus folder dari database
    const { error: deleteError } = await supabase
      .from('folders')
      .delete()
      .eq('id', folderId)
      .eq('user_id', userId);

    if (deleteError) throw deleteError;

    res.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({
      success: false,
      error: 'Gagal menghapus folder: ' + error.message
    });
  }
});

// POST endpoint untuk membuat folder
router.post('/folders', async (req, res) => {
  try {
    const { name, path: folderPath = '' } = req.body;
    const userId = req.user.userId;

    console.log('Creating folder:', { name, folderPath, userId });

    // Validasi nama folder
    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Nama folder tidak boleh kosong'
      });
    }

    // Cek folder duplikat
    const { data: existingFolder, error: checkError } = await supabase
      .from('folders')
      .select('id')
      .eq('user_id', userId)
      .eq('name', name)
      .eq('path', folderPath)
      .single();

    if (checkError && checkError.code !== 'PGRST116') throw checkError;
    
    if (existingFolder) {
      return res.status(400).json({
        success: false,
        error: 'Folder dengan nama tersebut sudah ada'
      });
    }

    // Insert ke database
    const { data: folder, error: insertError } = await supabase
      .from('folders')
      .insert({
        name,
        path: folderPath,
        user_id: userId
      })
      .select()
      .single();

    if (insertError) throw insertError;

    res.json({
      success: true,
      folder: {
        id: folder.id,
        name: folder.name,
        type: 'folder',
        created_at: folder.created_at
      }
    });

  } catch (error) {
    console.error('Create folder error:', error);
    res.status(500).json({
      success: false,
      error: 'Gagal membuat folder: ' + error.message
    });
  }
});

// PUT endpoint untuk rename file/folder
router.put('/rename/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;
    const { newName } = req.body;
    const userId = req.user.userId;

    console.log('Rename request:', { type, id, newName, userId });

    if (type === 'folder') {
      // Cek folder duplikat
      const { data: existingFolder, error: checkError } = await supabase
        .from('folders')
        .select('id')
        .eq('user_id', userId)
        .eq('name', newName)
        .single();

      if (checkError && checkError.code !== 'PGRST116') throw checkError;
      if (existingFolder) {
        return res.status(400).json({
          success: false,
          error: 'Folder dengan nama tersebut sudah ada'
        });
      }

      // Update nama folder
      const { error: updateError } = await supabase
        .from('folders')
        .update({ name: newName })
        .eq('id', id)
        .eq('user_id', userId);

      if (updateError) throw updateError;

    } else {
      // Update nama file
      const { error: updateError } = await supabase
        .from('files')
        .update({ original_name: newName })
        .eq('id', id)
        .eq('user_id', userId);

      if (updateError) throw updateError;
    }

    res.json({ success: true });

  } catch (error) {
    console.error('Rename error:', error);
    res.status(500).json({
      success: false,
      error: 'Gagal mengubah nama: ' + error.message
    });
  }
});

// GET endpoint untuk download file
router.get('/download/:id', async (req, res) => {
  try {
    const fileId = req.params.id;
    const userId = req.user.userId;

    // Dapatkan informasi file dari database
    const { data: file, error: fetchError } = await supabase
      .from('files')
      .select('*')
      .eq('id', fileId)
      .eq('user_id', userId)
      .single();

    if (fetchError) throw fetchError;
    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File tidak ditemukan'
      });
    }

    // Dapatkan signed URL untuk download
    const { data: { signedUrl }, error: signedUrlError } = await supabase.storage
      .from('files')
      .createSignedUrl(`${userId}/${file.path}/${file.filename}`, 60); // URL valid selama 60 detik

    if (signedUrlError) throw signedUrlError;

    res.json({
      success: true,
      downloadUrl: signedUrl,
      filename: file.original_name
    });

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({
      success: false,
      error: 'Gagal mengunduh file: ' + error.message
    });
  }
});

// GET endpoint untuk search
router.get('/search', async (req, res) => {
  try {
    const { query } = req.query;
    const userId = req.user.userId;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Parameter pencarian tidak boleh kosong'
      });
    }

    // Cari file
    const { data: files, error: filesError } = await supabase
      .from('files')
      .select('*')
      .eq('user_id', userId)
      .ilike('original_name', `%${query}%`)
      .order('created_at', { ascending: false });

    if (filesError) throw filesError;

    // Cari folder
    const { data: folders, error: foldersError } = await supabase
      .from('folders')
      .select('*')
      .eq('user_id', userId)
      .ilike('name', `%${query}%`)
      .order('name', { ascending: true });

    if (foldersError) throw foldersError;

    res.json({
      success: true,
      results: {
        files: files.map(file => ({
          id: file.id,
          name: file.original_name,
          url: file.file_url,
          path: file.path,
          created_at: file.created_at,
          type: 'file'
        })),
        folders: folders.map(folder => ({
          id: folder.id,
          name: folder.name,
          path: folder.path,
          created_at: folder.created_at,
          type: 'folder'
        }))
      }
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      error: 'Gagal melakukan pencarian: ' + error.message
    });
  }
});

// GET endpoint untuk detail file/folder
router.get('/details/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;
    const userId = req.user.userId;

    if (type === 'file') {
      const { data: file, error: fileError } = await supabase
        .from('files')
        .select(`
          id,
          filename,
          original_name,
          path,
          file_url,
          mime_type,
          created_at,
          updated_at
        `)
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (fileError) throw fileError;
      if (!file) {
        return res.status(404).json({
          success: false,
          error: 'File tidak ditemukan'
        });
      }

      res.json({
        success: true,
        item: {
          ...file,
          type: 'file',
          name: file.original_name
        }
      });

    } else if (type === 'folder') {
      // Dapatkan detail folder
      const { data: folder, error: folderError } = await supabase
        .from('folders')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (folderError) throw folderError;
      if (!folder) {
        return res.status(404).json({
          success: false,
          error: 'Folder tidak ditemukan'
        });
      }

      // Hitung jumlah item dalam folder
      const [filesCount, foldersCount] = await Promise.all([
        supabase
          .from('files')
          .select('id', { count: 'exact' })
          .eq('user_id', userId)
          .eq('path', folder.path + '/' + folder.name),
        supabase
          .from('folders')
          .select('id', { count: 'exact' })
          .eq('user_id', userId)
          .eq('path', folder.path + '/' + folder.name)
      ]);

      res.json({
        success: true,
        item: {
          ...folder,
          type: 'folder',
          name: folder.name,
          itemsCount: {
            files: filesCount.count,
            folders: foldersCount.count
          }
        }
      });

    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid type'
      });
    }

  } catch (error) {
    console.error('Details error:', error);
    res.status(500).json({
      success: false,
      error: 'Gagal mendapatkan detail: ' + error.message
    });
  }
});

// GET endpoint untuk statistik storage
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.userId;

    // Dapatkan total ukuran file
    const { data: files, error: filesError } = await supabase
      .from('files')
      .select('size')
      .eq('user_id', userId);

    if (filesError) throw filesError;

    // Hitung total storage yang digunakan (dalam bytes)
    const totalStorage = files.reduce((acc, file) => acc + (file.size || 0), 0);

    // Dapatkan jumlah file dan folder
    const [filesCount, foldersCount] = await Promise.all([
      supabase
        .from('files')
        .select('id', { count: 'exact' })
        .eq('user_id', userId),
      supabase
        .from('folders')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
    ]);

    // Format ukuran storage yang lebih mudah dibaca
    const formatStorage = (bytes) => {
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      if (bytes === 0) return '0 Byte';
      const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
      return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
    };

    res.json({
      success: true,
      stats: {
        totalStorage: totalStorage,
        readableStorage: formatStorage(totalStorage),
        filesCount: filesCount.count || 0,
        foldersCount: foldersCount.count || 0,
        totalItems: (filesCount.count || 0) + (foldersCount.count || 0)
      }
    });

  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Gagal mendapatkan statistik: ' + error.message
    });
  }
});

// GET endpoint untuk breadcrumb path
router.get('/breadcrumb', async (req, res) => {
  try {
    const { path = '' } = req.query;
    const userId = req.user.userId;

    if (!path) {
      return res.json({
        success: true,
        breadcrumb: [{
          name: 'Home',
          path: '',
        }]
      });
    }

    // Split path dan buat array breadcrumb
    const pathParts = path.split('/').filter(Boolean);
    const breadcrumb = [{
      name: 'Home',
      path: '',
    }];

    let currentPath = '';
    for (const part of pathParts) {
      currentPath += (currentPath ? '/' : '') + part;
      
      // Dapatkan informasi folder untuk setiap bagian path
      const { data: folder, error: folderError } = await supabase
        .from('folders')
        .select('name')
        .eq('user_id', userId)
        .eq('name', part)
        .single();

      if (folderError && folderError.code !== 'PGRST116') throw folderError;

      breadcrumb.push({
        name: folder ? folder.name : part,
        path: currentPath,
      });
    }

    res.json({
      success: true,
      breadcrumb
    });

  } catch (error) {
    console.error('Breadcrumb error:', error);
    res.status(500).json({
      success: false,
      error: 'Gagal mendapatkan breadcrumb: ' + error.message
    });
  }
});

// GET endpoint untuk riwayat aktivitas
router.get('/activity', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { limit = 10, offset = 0 } = req.query;

    // Dapatkan riwayat aktivitas file
    const { data: activities, error: activityError, count } = await supabase
      .from('file_activities')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (activityError) throw activityError;

    // Format aktivitas
    const formattedActivities = activities.map(activity => ({
      id: activity.id,
      type: activity.activity_type, // upload, delete, rename, move
      itemType: activity.item_type, // file atau folder
      itemName: activity.item_name,
      details: activity.details,
      created_at: activity.created_at
    }));

    res.json({
      success: true,
      activities: formattedActivities,
      pagination: {
        total: count,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error) {
    console.error('Activity log error:', error);
    res.status(500).json({
      success: false,
      error: 'Gagal mendapatkan riwayat aktivitas: ' + error.message
    });
  }
});

// POST endpoint untuk mencatat aktivitas
const logActivity = async (userId, activityType, itemType, itemName, details = {}) => {
  try {
    const { error } = await supabase
      .from('file_activities')
      .insert({
        user_id: userId,
        activity_type: activityType,
        item_type: itemType,
        item_name: itemName,
        details
      });

    if (error) throw error;
  } catch (error) {
    console.error('Error logging activity:', error);
  }
};

// POST endpoint untuk copy file/folder
router.post('/copy/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;
    const { destinationPath } = req.body;
    const userId = req.user.userId;

    if (type === 'file') {
      // Copy file logic
      const { data: file } = await supabase
        .from('files')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      // Copy file di storage
      const { data: copyData } = await supabase.storage
        .from('files')
        .copy(
          `${userId}/${file.path}/${file.filename}`,
          `${userId}/${destinationPath}/${file.filename}`
        );

      // Insert metadata file baru
      await supabase.from('files').insert({
        filename: file.filename,
        original_name: file.original_name,
        path: destinationPath,
        file_url: file.file_url,
        mime_type: file.mime_type,
        user_id: userId
      });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Gagal menyalin: ' + error.message
    });
  }
});

// Endpoint lainnya akan ditambahkan sesuai kebutuhan

// Format bytes ke human readable
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Validasi file
function validateFile(file) {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  
  if (!file) {
    throw new Error('File tidak ditemukan');
  }
  
  if (file.size > maxSize) {
    throw new Error('Ukuran file melebihi batas maksimum (10MB)');
  }
  
  if (!allowedTypes.includes(file.mimetype)) {
    throw new Error('Tipe file tidak diizinkan');
  }
}

router.get('/preview/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    // Dapatkan data file dari database
    const { data: file, error } = await supabase
      .from('files')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();
      
    if (error) {
      console.error('Database error:', error);
      throw new Error('Gagal mengambil data file');
    }

    if (!file) {
      throw new Error('File tidak ditemukan');
    }

    // Pastikan file adalah gambar
    const imageTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!imageTypes.includes(file.mime_type)) {
      throw new Error('File bukan gambar');
    }

    // Buat path file
    const filePath = `${userId}/${file.path}/${file.filename}`.replace(/\/+/g, '/');
    
    // Generate signed URL untuk preview dan download
    const [previewUrl, downloadUrl] = await Promise.all([
      supabase.storage.from('files').createSignedUrl(filePath, 300),
      supabase.storage.from('files').createSignedUrl(filePath, 60, {
        download: true,
        filename: file.original_name
      })
    ]);

    if (previewUrl.error || downloadUrl.error) {
      throw new Error('Gagal membuat URL');
    }

    res.json({
      success: true,
      url: previewUrl.data.signedUrl,
      downloadUrl: downloadUrl.data.signedUrl,
      filename: file.original_name,
      id: file.id
    });

  } catch (error) {
    console.error('Preview error:', error);
    res.status(error.message.includes('tidak ditemukan') ? 404 : 500).json({
      success: false,
      error: error.message || 'Gagal mendapatkan preview file'
    });
  }
});

module.exports = { router };
