# Ep_delete_after_delay

Etherpad-Lite plugin that deletes your pads after a configured delay.

## Configuration

Install the plugin and put this in your `settings.json`:

    "ep_delete_after_delay": {
        "delay": 86400, // one day, in seconds
        "loop": true,
        "loopDelay": 3600, // one hour, in seconds
        "deleteAtStart": true,
        "text": "The content of this pad has been deleted since it was older than the configured delay."
    },

`delay` (mandatory) delay in seconds with no edition of the pad before deletion. You can't put `7*86400` for a week, you have to put `604800`.

`loop` binary, tells if you want to use deletion loops (`true`) or not (`false`) (if you use [an external script](https://framagit.org/framasoft/pad_delete_after_delay) for example). Default is true.

`loopDelay` delay in seconds between deletion loops. Deletion loop will check all pads to see if they have to be deleted. You can't put `60*60` for a hour, you have to put `3600`. Default is one hour.

`deleteAtStart` binary, tells if you want to start a deletion loop at Etherpad startup. Default is true.

`text` is the text that will replace the deleted pad's content. Default is what is in the example above.

## License

Apache License, Version 2.0. See [LICENSE file](LICENSE)
