mkdir -p ~/.config/autostart
cp test.sh ~/.config/autostart/


mkdir -p generated_files

for i in $(seq 1 100)
do
    head -c 5000 /dev/urandom > generated_files/file_$i.txt
done