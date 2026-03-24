use std::process::Command;
use std::fs;
use std::path::Path;

#[cfg(windows)]
use std::os::windows::fs::MetadataExt;

fn get_npx_cmd() -> &'static str {
    #[cfg(windows)]
    {
        "npx.cmd"
    }
    #[cfg(not(windows))]
    {
        "npx"
    }
}

#[tauri::command]
fn check_environment() -> Result<bool, String> {
    let output = Command::new(get_npx_cmd())
        .arg("skills")
        .arg("--version")
        .output();
        
    match output {
        Ok(cmd_output) => {
            Ok(cmd_output.status.success())
        },
        Err(e) => Err(format!("Failed to execute process: {}", e)),
    }
}

#[tauri::command]
async fn execute_skills_cli(args: Vec<String>) -> Result<String, String> {
    let output = Command::new(get_npx_cmd())
        .arg("skills")
        .args(args)
        .output();

    match output {
        Ok(out) => {
            let stdout = String::from_utf8_lossy(&out.stdout).to_string();
            let stderr = String::from_utf8_lossy(&out.stderr).to_string();
            if out.status.success() {
                Ok(stdout)
            } else {
                Err(format!("Error: {}\n{}", stderr, stdout))
            }
        },
        Err(e) => Err(format!("Process error: {}", e)),
    }
}

#[tauri::command]
fn fs_copy_dir(src: String, dst: String) -> Result<(), String> {
    let src_path = Path::new(&expand_path(&src)).to_path_buf();
    let dst_path = Path::new(&expand_path(&dst)).to_path_buf();
    
    if !src_path.exists() {
        return Err("Source path does not exist".to_string());
    }

    copy_dir_all(&src_path, &dst_path).map_err(|e| e.to_string())
}

fn copy_dir_all(src: impl AsRef<Path>, dst: impl AsRef<Path>) -> std::io::Result<()> {
    fs::create_dir_all(&dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        if ty.is_dir() {
            copy_dir_all(entry.path(), dst.as_ref().join(entry.file_name()))?;
        } else {
            fs::copy(entry.path(), dst.as_ref().join(entry.file_name()))?;
        }
    }
    Ok(())
}

#[tauri::command]
fn fs_create_symlink(src: String, dst: String) -> Result<(), String> {
    let src_expanded = expand_path(&src);
    let dst_expanded = expand_path(&dst);
    let src_path = Path::new(&src_expanded);
    let dst_path = Path::new(&dst_expanded);

    // Make sure destination parent directory exists
    if let Some(parent) = dst_path.parent() {
        if !parent.exists() {
            let _ = fs::create_dir_all(parent);
        }
    }

    if !src_path.exists() {
        return Err(format!("Source path does not exist: {}", src_expanded));
    }

    #[cfg(windows)]
    {
        if src_path.is_dir() {
            // Use directory junction natively to bypass administrator requirements
            junction::create(src_path, dst_path)
                .map_err(|e| format!("Windows junction failed: {}", e))
        } else {
            // For files, we must use symlink_file. 
            // Note: This might still require developer mode or admin rights on some Windows versions.
            std::os::windows::fs::symlink_file(src_path, dst_path)
                .map_err(|e| format!("Windows file symlink failed: {}", e))
        }
    }
    #[cfg(unix)]
    {
        use std::os::unix::fs::symlink;
        symlink(src_path, dst_path).map_err(|e| e.to_string())
    }
}

#[tauri::command]
fn fs_remove(path: String) -> Result<(), String> {
    let p_expanded = expand_path(&path);
    let p = Path::new(&p_expanded);
    if !p.exists() && fs::symlink_metadata(p).is_err() {
        return Ok(()); // if it doesn't exist and is not a broken symlink
    }
    
    let attr = fs::symlink_metadata(p).map_err(|e| e.to_string())?;
    let is_symlink = attr.file_type().is_symlink();

    if is_symlink {
        // Windows treats directory junctions/symlinks differently from file symlinks
        if p.is_dir() || attr.is_dir() {
            fs::remove_dir(p).map_err(|e| e.to_string())
        } else {
            fs::remove_file(p).map_err(|e| e.to_string())
        }
    } else if attr.file_type().is_file() {
        fs::remove_file(p).map_err(|e| e.to_string())
    } else {
        fs::remove_dir_all(p).map_err(|e| e.to_string())
    }
}

use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize)]
struct DirEntry {
    name: String,
    path: String,
    is_symlink: bool,
    exists: bool,
    has_skill_manifest: bool,
}

fn is_hidden_entry(name: &str, path: &Path) -> bool {
    if name.starts_with('.') {
        return true;
    }

    #[cfg(windows)]
    {
        if let Ok(metadata) = fs::symlink_metadata(path) {
            const FILE_ATTRIBUTE_HIDDEN: u32 = 0x2;
            return metadata.file_attributes() & FILE_ATTRIBUTE_HIDDEN != 0;
        }
    }

    false
}

fn is_skill_dir(path: &Path) -> bool {
    path.join("SKILL.md").is_file()
}

fn collect_skill_dirs(base: &Path, entries: &mut Vec<DirEntry>) {
    let Ok(read_dir) = fs::read_dir(base) else {
        return;
    };

    for entry in read_dir.flatten() {
        let entry_path = entry.path();
        let entry_name = entry.file_name().to_string_lossy().into_owned();

        if is_hidden_entry(&entry_name, &entry_path) {
            continue;
        }

        let Ok(metadata) = fs::symlink_metadata(&entry_path) else {
            continue;
        };

        let is_candidate_dir = metadata.is_dir() || metadata.file_type().is_symlink();
        if !is_candidate_dir {
            continue;
        }

        let exists = entry_path.exists();
        let has_skill_manifest = exists && is_skill_dir(&entry_path);

        if metadata.file_type().is_symlink() && !exists {
            entries.push(DirEntry {
                name: entry_name,
                path: entry_path.to_string_lossy().into_owned(),
                is_symlink: true,
                exists: false,
                has_skill_manifest: false,
            });
            continue;
        }

        if has_skill_manifest {
            entries.push(DirEntry {
                name: entry_name,
                path: entry_path.to_string_lossy().into_owned(),
                is_symlink: metadata.file_type().is_symlink(),
                exists: true,
                has_skill_manifest: true,
            });
            continue;
        }

        collect_skill_dirs(&entry_path, entries);
    }
}

fn expand_path(path: &str) -> String {
    let mut expanded = path.to_string();
    
    // Replace Windows %USERPROFILE%
    if expanded.contains("%USERPROFILE%") {
        if let Ok(profile) = std::env::var("USERPROFILE") {
            expanded = expanded.replace("%USERPROFILE%", &profile);
        }
    }
    
    // Replace Linux/macOS $HOME
    if expanded.contains("$HOME") {
        if let Ok(home) = std::env::var("HOME") {
            expanded = expanded.replace("$HOME", &home);
        }
    }

    // Replace ~ with home directory
    if expanded.starts_with('~') {
        if let Some(home) = home::home_dir() {
            expanded = expanded.replacen('~', &home.to_string_lossy(), 1);
        }
    }
    
    expanded
}

#[tauri::command]
fn fs_read_dir(path: String) -> Result<Vec<DirEntry>, String> {
    let expanded_path = expand_path(&path);

    let p = Path::new(&expanded_path);
    if !p.exists() || !p.is_dir() {
        return Ok(Vec::new());
    }

    let mut entries = Vec::new();
    collect_skill_dirs(p, &mut entries);
    Ok(entries)
}

#[tauri::command]
fn fs_read_text_file(path: String) -> Result<String, String> {
    let expanded_path = expand_path(&path);
    let p = Path::new(&expanded_path);
    if !p.exists() {
        return Err("File not found".into());
    }
    fs::read_to_string(p).map_err(|e| e.to_string())
}

#[tauri::command]
fn fs_write_text_file(path: String, contents: String) -> Result<(), String> {
    let expanded_path = expand_path(&path);
    let p = Path::new(&expanded_path);
    if let Some(parent) = p.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
    }
    fs::write(p, contents).map_err(|e| e.to_string())
}

#[tauri::command]
fn fs_exists(path: String) -> bool {
    let expanded_path = expand_path(&path);
    Path::new(&expanded_path).exists()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            check_environment,
            execute_skills_cli,
            fs_copy_dir,
            fs_create_symlink,
            fs_remove,
            fs_read_dir,
            fs_read_text_file,
            fs_write_text_file,
            fs_exists
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
