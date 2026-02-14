package com.homeservices.domain;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.util.UUID;

/**
 * Converts UUID to/from String for CHAR(36) columns.
 * Hibernate defaults to binary for UUID; this ensures we persist readable strings
 * (e.g. "550e8400-e29b-41d4-a716-446655440000") instead of raw bytes.
 */
@Converter(autoApply = false)
public class UuidStringConverter implements AttributeConverter<UUID, String> {

    @Override
    public String convertToDatabaseColumn(UUID attribute) {
        return attribute == null ? null : attribute.toString();
    }

    @Override
    public UUID convertToEntityAttribute(String dbData) {
        return dbData == null ? null : UUID.fromString(dbData);
    }
}
