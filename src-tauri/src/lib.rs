// Input validation helper functions
fn validate_string_length(input: &str, max_length: usize) -> Result<(), String> {
    if input.len() > max_length {
        return Err(format!("Input exceeds maximum length of {} characters", max_length));
    }
    Ok(())
}

fn sanitize_string(input: &str) -> String {
    // Remove any potentially dangerous characters
    input.chars()
        .filter(|c| c.is_alphanumeric() || c.is_whitespace() || *c == '-' || *c == '_' || *c == '.')
        .collect()
}

// Basic command handler for platform information
#[tauri::command]
fn get_platform_info() -> Result<String, String> {
    let platform = std::env::consts::OS;
    Ok(platform.to_string())
}

// Basic command handler for app version
#[tauri::command]
fn get_app_version() -> Result<String, String> {
    Ok(env!("CARGO_PKG_VERSION").to_string())
}

// Basic command handler for greeting (example for future native features)
// Now with input validation
#[tauri::command]
fn greet(name: String) -> Result<String, String> {
    // Validate input length (max 100 characters)
    validate_string_length(&name, 100)?;
    
    // Sanitize the input to prevent injection attacks
    let sanitized_name = sanitize_string(&name);
    
    // Check if name is empty after sanitization
    if sanitized_name.trim().is_empty() {
        return Err("Name cannot be empty".to_string());
    }
    
    Ok(format!("Hello, {}! Welcome to TIPTV.", sanitized_name))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_store::Builder::default().build())
    .plugin(tauri_plugin_process::init())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      get_platform_info,
      get_app_version,
      greet
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_platform_info() {
        // Test that get_platform_info returns a valid platform string
        let result = get_platform_info();
        assert!(result.is_ok());
        
        let platform = result.unwrap();
        // Platform should be one of the supported OS types
        let valid_platforms = vec!["windows", "macos", "linux", "ios", "android"];
        assert!(valid_platforms.contains(&platform.as_str()), 
                "Platform '{}' should be one of: {:?}", platform, valid_platforms);
    }

    #[test]
    fn test_get_app_version() {
        // Test that get_app_version returns a valid version string
        let result = get_app_version();
        assert!(result.is_ok());
        
        let version = result.unwrap();
        // Version should not be empty
        assert!(!version.is_empty(), "Version should not be empty");
        // Version should match the package version
        assert_eq!(version, env!("CARGO_PKG_VERSION"));
    }

    #[test]
    fn test_greet_with_name() {
        // Test that greet returns a proper greeting message
        let name = "Test User".to_string();
        let result = greet(name.clone());
        assert!(result.is_ok());
        
        let greeting = result.unwrap();
        // Greeting should contain the user's name
        assert!(greeting.contains(&name), 
                "Greeting '{}' should contain name '{}'", greeting, name);
        // Greeting should contain "TIPTV"
        assert!(greeting.contains("TIPTV"), 
                "Greeting should mention TIPTV");
    }

    #[test]
    fn test_greet_with_empty_name() {
        // Test that greet rejects empty names after validation
        let name = "".to_string();
        let result = greet(name);
        assert!(result.is_err());
        
        let error = result.unwrap_err();
        // Should return an error about empty name
        assert!(error.contains("empty"));
    }

    #[test]
    fn test_greet_with_long_name() {
        // Test that greet rejects names that are too long
        let name = "a".repeat(101); // 101 characters, exceeds max of 100
        let result = greet(name);
        assert!(result.is_err());
        
        let error = result.unwrap_err();
        // Should return an error about length
        assert!(error.contains("maximum length"));
    }

    #[test]
    fn test_greet_sanitizes_input() {
        // Test that greet sanitizes special characters
        let name = "Test<script>alert('xss')</script>User".to_string();
        let result = greet(name);
        assert!(result.is_ok());
        
        let greeting = result.unwrap();
        // Should not contain script tags
        assert!(!greeting.contains("<script>"));
        assert!(!greeting.contains("</script>"));
        // Should contain sanitized version
        assert!(greeting.contains("TestscriptalertxssscriptUser"));
    }

    #[test]
    fn test_validate_string_length() {
        // Test the validation helper function
        assert!(validate_string_length("short", 10).is_ok());
        assert!(validate_string_length("exactly10!", 10).is_ok());
        assert!(validate_string_length("too long string", 5).is_err());
    }

    #[test]
    fn test_sanitize_string() {
        // Test the sanitization helper function
        assert_eq!(sanitize_string("normal text"), "normal text");
        assert_eq!(sanitize_string("test-name_123"), "test-name_123");
        assert_eq!(sanitize_string("test<>{}[]"), "test");
        assert_eq!(sanitize_string("test@#$%"), "test");
    }

    #[test]
    fn test_command_handlers_accessible() {
        // Verify that command handlers can be called without panicking
        // This tests that the functions are properly accessible
        let _ = get_platform_info();
        let _ = get_app_version();
        let _ = greet("Test".to_string());
    }
}
