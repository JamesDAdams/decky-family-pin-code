import asyncio
import os
try:
    import decky
except ImportError:
    decky = None


class Plugin:
    async def _main(self):
        if decky:
            decky.logger.info("[FamilyViewNumpad] Backend initialized.")

    async def _unload(self):
        if decky:
            decky.logger.info("[FamilyViewNumpad] Backend unloaded.")

    async def _uninstall(self):
        if decky:
            decky.logger.info("[FamilyViewNumpad] Backend uninstalled.")
