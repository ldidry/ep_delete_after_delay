# Ep_delete_after_delay

Etherpad-Lite plugin that deletes your pads after a configured delay.

## Configuration

Install the plugin and put this in your `settings.json`:

    "ep_delete_after_delay": {
        "delay": 86400, // one day, in seconds
        "text": "The content of this pad has been deleted since it was older than the configured delay."
    },

`delay` (mandatory) is in seconds. You can't put `7*86400` for a week, you have to put `604800`.

`text` is the text that will replace the deleted pad's content. Default is what is in the example above.

## License

Copyright 2015 Luc Didry

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
