ALTER TABLE auth.users 
ADD COLUMN theme_mode VARCHAR(20) DEFAULT 'light',
ADD COLUMN theme_pos VARCHAR(50) DEFAULT 'blue',
ADD COLUMN theme_neg VARCHAR(50) DEFAULT 'red';
