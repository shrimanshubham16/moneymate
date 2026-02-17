"""
Selenium WebDriver (ChromeDriver) Example
How to pass console commands to ChromeDriver browser
"""

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time

def setup_chromedriver():
    """Setup ChromeDriver with console logging enabled"""
    chrome_options = Options()
    
    # Enable console logging
    chrome_options.set_capability('goog:loggingPrefs', {'browser': 'ALL'})
    
    # Optional: Add other Chrome arguments
    chrome_options.add_argument('--disable-blink-features=AutomationControlled')
    chrome_options.add_argument('--enable-logging')
    
    driver = webdriver.Chrome(options=chrome_options)
    return driver

def execute_console_command(driver, command):
    """Execute JavaScript command in browser console"""
    return driver.execute_script(command)

def execute_console_command_with_return(driver, command):
    """Execute JavaScript and return value"""
    return driver.execute_script(f"return {command}")

def get_console_logs(driver):
    """Get all console logs from browser"""
    logs = driver.get_log('browser')
    return logs

def example_basic_usage():
    """Basic example of executing console commands"""
    driver = setup_chromedriver()
    
    try:
        # Navigate to a page
        driver.get('http://localhost:5174')
        
        # Method 1: Execute JavaScript without return value
        driver.execute_script("console.log('Hello from Selenium');")
        
        # Method 2: Execute and get return value
        title = driver.execute_script("return document.title;")
        print(f"Page title: {title}")
        
        # Method 3: Execute with arguments
        result = driver.execute_script(
            "return arguments[0] + arguments[1];", 
            5, 10
        )
        print(f"Result: {result}")
        
        # Method 4: Execute async JavaScript
        async_result = driver.execute_async_script("""
            var callback = arguments[arguments.length - 1];
            setTimeout(function() {
                callback('Async result');
            }, 1000);
        """)
        print(f"Async result: {async_result}")
        
        # Get console logs
        logs = get_console_logs(driver)
        for log in logs:
            print(f"Console [{log['level']}]: {log['message']}")
            
    finally:
        driver.quit()

def example_localstorage():
    """Example: Working with localStorage"""
    driver = setup_chromedriver()
    
    try:
        driver.get('http://localhost:5174')
        
        # Set localStorage
        driver.execute_script("localStorage.setItem('test-key', 'test-value');")
        
        # Get localStorage
        value = driver.execute_script("return localStorage.getItem('test-key');")
        print(f"localStorage value: {value}")
        
        # Remove localStorage
        driver.execute_script("localStorage.removeItem('test-key');")
        
    finally:
        driver.quit()

def example_window_object():
    """Example: Accessing window object"""
    driver = setup_chromedriver()
    
    try:
        driver.get('http://localhost:5174')
        
        # Get window property
        user_agent = driver.execute_script("return navigator.userAgent;")
        print(f"User Agent: {user_agent}")
        
        # Set window property
        driver.execute_script("window.testProperty = 'test-value';")
        
        # Get window property
        test_value = driver.execute_script("return window.testProperty;")
        print(f"Window property: {test_value}")
        
    finally:
        driver.quit()

def example_capture_console_output():
    """Example: Capture console.log output"""
    driver = setup_chromedriver()
    
    try:
        driver.get('http://localhost:5174')
        
        # Clear existing logs
        driver.get_log('browser')
        
        # Execute console.log
        driver.execute_script("console.log('Test message');")
        driver.execute_script("console.error('Error message');")
        driver.execute_script("console.warn('Warning message');")
        
        # Wait a bit for logs
        time.sleep(0.5)
        
        # Get all console logs
        logs = get_console_logs(driver)
        for log in logs:
            level = log['level']
            message = log['message']
            print(f"[{level}] {message}")
            
    finally:
        driver.quit()

def example_execute_function():
    """Example: Execute a function defined in page"""
    driver = setup_chromedriver()
    
    try:
        driver.get('http://localhost:5174')
        
        # Define a function in page context
        driver.execute_script("""
            window.myFunction = function(a, b) {
                return a + b;
            };
        """)
        
        # Call the function
        result = driver.execute_script("return window.myFunction(5, 10);")
        print(f"Function result: {result}")
        
    finally:
        driver.quit()

if __name__ == '__main__':
    print("=== Basic Usage ===")
    example_basic_usage()
    
    print("\n=== LocalStorage Example ===")
    example_localstorage()
    
    print("\n=== Window Object Example ===")
    example_window_object()
    
    print("\n=== Capture Console Output ===")
    example_capture_console_output()
    
    print("\n=== Execute Function ===")
    example_execute_function()
