#!/bin/bash

# Write .transifexrc file if not exists
if [ ! -f ~/.transifexrc ]; then
  echo "[https://www.transifex.com]" > ~/.transifexrc
  echo "hostname = https://www.transifex.com" >> ~/.transifexrc
  echo "username = api" >> ~/.transifexrc
  echo "password = $WP_TRANSIFEX_API_TOKEN" >> ~/.transifexrc
  echo "token =" >> ~/.transifexrc
fi

echo "Getting translations from Transifex..."
tx pull -a -f

echo "Generating MO files..."
for file in `find ./lang/ -name "*.po"` ; do
  msgfmt -o ${file/.po/.mo} $file
done
echo "Done"
