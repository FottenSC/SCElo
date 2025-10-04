-- Create a local admin user for development after every reset
DO $$
DECLARE
  existing_user uuid;
  new_user_id uuid;
BEGIN
  -- Check if the user already exists
  SELECT id INTO existing_user
  FROM auth.users
  WHERE email = 'prestegaard9@gmail.com';

  IF existing_user IS NULL THEN
    -- Create a new user row directly (local dev only)
    new_user_id := gen_random_uuid();

    -- Insert user with a bcrypt-hashed password and confirmed email
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      aud,
      role,
      is_sso_user
    ) VALUES (
      new_user_id,
      '00000000-0000-0000-0000-000000000000',
      'prestegaard9@gmail.com',
      crypt('EloSite', gen_salt('bf')),
      now(),
      jsonb_build_object('role', 'admin'),
      '{}'::jsonb,
      'authenticated',
      'authenticated',
      false
    );

    -- Best-effort insert into identities (schema can vary by version)
    BEGIN
      INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        new_user_id,
        jsonb_build_object('sub', new_user_id::text, 'email', 'prestegaard9@gmail.com'),
        'email',
        now(),
        now(),
        now()
      );
    EXCEPTION WHEN others THEN
      -- Ignore if identities schema differs; user row is sufficient for local auth in most setups
      NULL;
    END;

    existing_user := new_user_id;
  END IF;

  -- Ensure admin role is present in app metadata
  UPDATE auth.users
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'admin')
  WHERE id = existing_user;
END $$;
