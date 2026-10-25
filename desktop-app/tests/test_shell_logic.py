"""
Unit tests for desktop app shell components:
- SingleInstance mutex
- Pairing validation & token handling
- Reachability checks
- Autostart configuration
- JS API bridge
"""

import os
import unittest
from unittest.mock import patch, MagicMock
from pathlib import Path

from app.single_instance import SingleInstance
from app.pairing import (
    validate_pairing_code,
    get_stored_device_token,
    store_device_token,
    clear_device_token,
    pair_device,
)
from app.shell import is_service_reachable, DesktopAppJsApi, AttentionDesktopApp
from tracker.config import TrackerConfig


class TestSingleInstance(unittest.TestCase):
    def test_single_instance_acquisition(self):
        """SingleInstance can acquire unique named mutex and releases properly."""
        test_mutex_name = f"TestMutex_{os.getpid()}"
        si1 = SingleInstance(test_mutex_name)
        acquired1 = si1.acquire()
        self.assertTrue(acquired1)

        # Second instance on same mutex should fail
        si2 = SingleInstance(test_mutex_name)
        acquired2 = si2.acquire()
        self.assertFalse(acquired2)

        # Cleanup
        si1.release()
        si2.release()


class TestPairingLogic(unittest.TestCase):
    def test_pairing_code_validation(self):
        """Validates 8-character Crockford Base32 strings (no 0, O, 1, I)."""
        self.assertTrue(validate_pairing_code("ABC23XYZ"))
        self.assertTrue(validate_pairing_code("23456789"))
        self.assertTrue(validate_pairing_code("abcdefgh"))  # normalized uppercase
        self.assertTrue(validate_pairing_code("  ABC23XYZ  "))

        # Invalid lengths
        self.assertFalse(validate_pairing_code("ABC23"))
        self.assertFalse(validate_pairing_code("ABC23XYZ123"))

        # Invalid characters (0, O, 1, I are disallowed in Crockford Base32)
        self.assertFalse(validate_pairing_code("ABC12345"))  # contains '1'
        self.assertFalse(validate_pairing_code("ABC02345"))  # contains '0'
        self.assertFalse(validate_pairing_code("ABCO2345"))  # contains 'O'
        self.assertFalse(validate_pairing_code("ABCI2345"))  # contains 'I'
        self.assertFalse(validate_pairing_code("ABC@#456"))

    def test_token_storage_and_clear(self):
        """Tests token saving, reading, and clearing."""
        test_token = "test_dev_token_9999"
        store_device_token(test_token)
        retrieved = get_stored_device_token()
        self.assertEqual(retrieved, test_token)

        clear_device_token()
        retrieved_after_clear = get_stored_device_token()
        self.assertIsNone(retrieved_after_clear)


class TestReachability(unittest.TestCase):
    def test_unreachable_endpoint(self):
        """is_service_reachable returns False on non-existent port."""
        self.assertFalse(is_service_reachable("http://127.0.0.1:59999", timeout=0.2))


class TestJsApiBridge(unittest.TestCase):
    def test_js_api_pair_validation_failure(self):
        """JS API pair rejects invalid code before network call."""
        mock_shell = MagicMock()
        mock_shell.config = TrackerConfig()
        js_api = DesktopAppJsApi(mock_shell)

        res = js_api.pair("INVALID")
        self.assertFalse(res["success"])
        self.assertIn("Invalid pairing code", res["error"])

    @patch("app.shell.pair_device")
    def test_js_api_pair_success(self, mock_pair_device):
        """JS API pair succeeds and notifies shell."""
        mock_pair_device.return_value = (True, "mock_token_12345")
        mock_shell = MagicMock()
        mock_shell.config = TrackerConfig()
        mock_shell.dashboard_url = "http://localhost:5173"
        js_api = DesktopAppJsApi(mock_shell)

        res = js_api.pair("ABC23XYZ")
        self.assertTrue(res["success"])
        self.assertEqual(res["dashboardUrl"], "http://localhost:5173")
        mock_shell.on_device_paired.assert_called_once_with("mock_token_12345")


class TestAttentionDesktopAppInit(unittest.TestCase):
    def test_desktop_app_init_defaults(self):
        """AttentionDesktopApp initializes properly with default config without errors."""
        app = AttentionDesktopApp()
        self.assertIsNotNone(app.config)
        self.assertEqual(app.config.api_base_url, "http://127.0.0.1:8000/api/v1")
        self.assertEqual(app.dashboard_url, "http://localhost:5173")
        self.assertTrue(app.app_dir.exists())
        self.assertTrue(app.assets_dir.exists())
        app.single_instance.release()


if __name__ == "__main__":
    unittest.main()

