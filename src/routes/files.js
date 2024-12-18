const express = require('express');
const router = express.Router();
const path = require('path');
const { supabase } = require('../config/supabase');
const { verifyToken } = require('../middleware/auth');
const fileUpload = require('express-fileupload');
const archiver = require('archiver');

router.use(verifyToken);
// GET files dan folders
router.get('/', async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: User ID tidak ditemukan'
      });
    }

    const userId = req.user.id;
    const { path = '' } = req.query;
    
    console.log('Fetching files for:', { userId, path });

    // Get files dengan error handling yang lebih baik
    const { data: files, error: filesError } = await supabase
      .from('files')
      .select('*')
      .eq('user_id', userId)
      .eq('path', path || '');

    if (filesError) {
      console.error('Files error:', filesError);
      throw filesError;
    }

    // Dapatkan public URL dan preview URL untuk setiap file
    const filesWithUrls = await Promise.all((files || []).map(async (file) => {
      const filePath = `${userId}/${file.path}/${file.filename}`.replace(/\/+/g, '/');
      
      // Dapatkan signed URL
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('files')
        .createSignedUrl(filePath, 3600); // URL valid selama 1 jam

      if (signedUrlError) {
        console.error('Signed URL error:', signedUrlError);
        return null;
      }

      // Dapatkan public URL
      const { data: publicUrlData } = await supabase.storage
        .from('files')
        .getPublicUrl(filePath);

      const previewUrl = getPreviewUrl(file, signedUrlData.signedUrl);

      return {
        id: file.id,
        name: file.original_name,
        type: 'file',
        size: file.size,
        mime_type: file.mime_type,
        created_at: file.created_at,
        url: publicUrlData.publicUrl,
        preview_url: previewUrl,
        path: file.path,
        filename: file.filename,
        can_preview: ['application/pdf', 'image/jpeg', 'image/png', 'image/gif'].includes(file.mime_type.toLowerCase())
      };
    }));

    // Filter out null values (failed to get URLs)
    const validFiles = filesWithUrls.filter(file => file !== null);

    // Get folders
    const { data: folders, error: foldersError } = await supabase
      .from('folders')
      .select('*')
      .eq('user_id', userId)
      .eq('path', path || '');

    if (foldersError) {
      console.error('Folders error:', foldersError);
      throw foldersError;
    }

    res.json({
      success: true,
      data: {
        folders: (folders || []).map(folder => ({
          id: folder.id,
          name: folder.name,
          type: 'folder',
          created_at: folder.created_at,
          path: folder.path
        })),
        files: validFiles
      }
    });

  } catch (error) {
    console.error('Error fetching files and folders:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Gagal mengambil data files dan folders'
    });
  }
});

// POST endpoint untuk upload file
router.post('/upload', async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    const file = req.files?.file;
    const path = req.body.path || '';

    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    // Upload ke storage bucket
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('files')
      .upload(`${req.user.id}/${path}/${file.name}`, file.data);

    if (uploadError) {
      throw uploadError;
    }

    // Dapatkan public URL
    const { data: publicUrlData } = await supabase.storage
      .from('files')
      .getPublicUrl(`${req.user.id}/${path}/${file.name}`);

    // Simpan data file ke database
    const { data: fileData, error: insertError } = await supabase
      .from('files')
      .insert({
        user_id: req.user.id,
        original_name: file.name,
        path: path,
        size: file.size,
        mime_type: file.mimetype,
        storage_path: uploadData.path,
        public_url: publicUrlData.publicUrl
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    res.json({
      success: true,
      data: fileData
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Gagal mengupload file: ' + error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// DELETE endpoint untuk file
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'ID file tidak valid'
      });
    }

    // Dapatkan informasi file sebelum dihapus
    const { data: file, error: fetchError } = await supabase
      .from('files')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      console.error('Fetch error:', fetchError);
      throw new Error('Gagal mengambil informasi file');
    }

    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File tidak ditemukan'
      });
    }

    // Hapus file dari storage
    const filePath = `${userId}/${file.path}/${file.filename}`.replace(/\/+/g, '/');
    const { error: storageError } = await supabase.storage
      .from('files')
      .remove([filePath]);

    if (storageError) {
      console.error('Storage error:', storageError);
      throw new Error('Gagal menghapus file dari storage');
    }

    // Hapus metadata dari database
    const { error: dbError } = await supabase
      .from('files')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Gagal menghapus data');
    }

    res.json({
      success: true,
      message: 'File berhasil dihapus'
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
    const userId = req.user.id;

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
    const userId = req.user.id;

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
    const userId = req.user.id;

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
    const userId = req.user.id;

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
    const userId = req.user.id;

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
    const userId = req.user.id;

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
    const userId = req.user.id;

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
    const userId = req.user.id;

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
    const userId = req.user.id;
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
    const userId = req.user.id;

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

// Modifikasi fungsi untuk mendapatkan preview URL berdasarkan tipe file
const getPreviewUrl = (file, signedUrl) => {
  const mimeType = file.mime_type.toLowerCase();
  
  // Untuk file PDF, gunakan Google Docs Viewer
  if (mimeType === 'application/pdf') {
    return `https://docs.google.com/viewer?url=${encodeURIComponent(signedUrl)}&embedded=true`;
  }
  
  // Untuk file dokumen Microsoft Office
  if (mimeType.includes('officedocument') || mimeType.includes('msword')) {
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(signedUrl)}`;
  }
  
  // Untuk gambar dan file lainnya, kembalikan URL langsung
  return signedUrl;
};

// Modifikasi endpoint preview untuk menangani berbagai tipe file
router.get('/preview/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const { data: file, error } = await supabase
      .from('files')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();
      
    if (error || !file) {
      throw new Error('File tidak ditemukan');
    }

    const filePath = `${userId}/${file.path}/${file.filename}`.replace(/\/+/g, '/');
    
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('files')
      .createSignedUrl(filePath, 3600);

    if (signedUrlError) {
      throw signedUrlError;
    }

    const previewUrl = getPreviewUrl(file, signedUrlData.signedUrl);

    res.json({
      success: true,
      url: signedUrlData.signedUrl,
      preview_url: previewUrl,
      filename: file.original_name,
      mime_type: file.mime_type,
      can_preview: ['application/pdf', 'image/jpeg', 'image/png', 'image/gif'].includes(file.mime_type.toLowerCase())
    });

  } catch (error) {
    console.error('Preview error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Gagal mendapatkan preview file'
    });
  }
});

// Tambahkan endpoint untuk download folder
router.get('/download-folder/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Dapatkan informasi folder
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

    // Set header untuk download zip
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=${folder.name}.zip`);

    // Buat zip stream
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    // Pipe archive ke response
    archive.pipe(res);

    // Dapatkan semua file dalam folder
    const { data: files, error: filesError } = await supabase
      .from('files')
      .select('*')
      .eq('user_id', userId)
      .eq('path', folder.path + '/' + folder.name);

    if (filesError) throw filesError;

    // Tambahkan file ke archive
    for (const file of files) {
      const { data } = await supabase.storage
        .from('files')
        .download(`${userId}/${file.path}/${file.filename}`);

      archive.append(await data.arrayBuffer(), { name: file.original_name });
    }

    // Finalisasi archive
    await archive.finalize();

  } catch (error) {
    console.error('Download folder error:', error);
    res.status(500).json({
      success: false,
      error: 'Gagal mengunduh folder: ' + error.message
    });
  }
});

module.exports = router;
